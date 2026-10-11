import { Capacitor } from '@capacitor/core';
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import { ensureNativeBleReady } from './bleNative';

export const FTMS_SERVICE_UUID = 0x1826;
export const CYCLING_POWER_SERVICE_UUID = 0x1818;

export const INDOOR_BIKE_DATA_CHAR_UUID = 0x2ad2;
export const FITNESS_MACHINE_CONTROL_POINT_CHAR_UUID = 0x2ad9;
export const FITNESS_MACHINE_STATUS_CHAR_UUID = 0x2ada;
export const CYCLING_POWER_MEASUREMENT_CHAR_UUID = 0x2a63;

export interface TrainerDataUpdate {
  instantaneousPower?: number;
  instantaneousCadence?: number;
  instantaneousSpeedKmh?: number;
  heartRate?: number;
  resistanceLevel?: number;
  totalDistanceMeters?: number;
}

export class TrainerBluetoothService {
  // Web Bluetooth state
  private webDevice: BluetoothDevice | null = null;
  private webServer: BluetoothRemoteGATTServer | null = null;
  private controlPointChar: BluetoothRemoteGATTCharacteristic | null = null;

  // Native Capacitor BLE state
  private nativeDeviceId: string | null = null;
  private nativeDeviceName: string | null = null;
  private nativeServiceUuid: string | null = null;
  private isNative = Capacitor.isNativePlatform();

  private onDataCallback: ((data: TrainerDataUpdate) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  public isConnected(): boolean {
    if (this.isNative) {
      return !!this.nativeDeviceId;
    }
    return !!(this.webServer && this.webServer.connected);
  }

  public getDeviceName(): string {
    if (this.isNative) {
      return this.nativeDeviceName || 'Smart Trainer';
    }
    return this.webDevice?.name || 'Smart Trainer';
  }

  public async connect(
    onData: (data: TrainerDataUpdate) => void,
    onDisconnect: () => void
  ): Promise<string> {
    this.onDataCallback = onData;
    this.onDisconnectCallback = onDisconnect;

    if (this.isNative) {
      return await this.connectNative();
    } else {
      return await this.connectWeb();
    }
  }

  // --- NATIVE ANDROID BLE (Capacitor) ---
  private async connectNative(): Promise<string> {
    await ensureNativeBleReady();

    const ftmsUuid = numberToUUID(FTMS_SERVICE_UUID);
    const cpsUuid = numberToUUID(CYCLING_POWER_SERVICE_UUID);

    const device = await BleClient.requestDevice({
      services: [ftmsUuid, cpsUuid],
      optionalServices: [ftmsUuid, cpsUuid, numberToUUID(0x180f)],
    });

    this.nativeDeviceId = device.deviceId;
    this.nativeDeviceName = device.name || 'Smart Trainer';

    await BleClient.connect(device.deviceId, () => {
      this.cleanup();
      this.onDisconnectCallback?.();
    });

    const bikeDataCharUuid = numberToUUID(INDOOR_BIKE_DATA_CHAR_UUID);
    const cpsCharUuid = numberToUUID(CYCLING_POWER_MEASUREMENT_CHAR_UUID);

    try {
      await BleClient.startNotifications(
        device.deviceId,
        ftmsUuid,
        bikeDataCharUuid,
        (value: DataView) => {
          const parsed = this.parseIndoorBikeData(value);
          this.onDataCallback?.(parsed);
        }
      );
      this.nativeServiceUuid = ftmsUuid;

      // Request control
      await this.requestControl();
    } catch {
      // Fallback to CPS
      try {
        await BleClient.startNotifications(
          device.deviceId,
          cpsUuid,
          cpsCharUuid,
          (value: DataView) => {
            const parsed = this.parseCyclingPower(value);
            this.onDataCallback?.(parsed);
          }
        );
        this.nativeServiceUuid = cpsUuid;
      } catch (err) {
        console.warn('Could not subscribe to native trainer notifications:', err);
      }
    }

    return this.nativeDeviceName || 'Smart Trainer';
  }

  // --- WEB BLUETOOTH (Browser & Desktop) ---
  private async connectWeb(): Promise<string> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not supported in this browser.');
    }

    this.webDevice = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [FTMS_SERVICE_UUID] },
        { services: [CYCLING_POWER_SERVICE_UUID] },
      ],
      optionalServices: [
        FTMS_SERVICE_UUID,
        CYCLING_POWER_SERVICE_UUID,
        0x180f,
        0x180a,
      ],
    });

    this.webDevice.addEventListener('gattserverdisconnected', () => {
      this.cleanup();
      this.onDisconnectCallback?.();
    });

    if (!this.webDevice.gatt) {
      throw new Error('Device does not support GATT server');
    }

    this.webServer = await this.webDevice.gatt.connect();

    let ftmsService: BluetoothRemoteGATTService | null = null;
    try {
      ftmsService = await this.webServer.getPrimaryService(FTMS_SERVICE_UUID);
    } catch {
      // ignore
    }

    if (ftmsService) {
      try {
        const bikeDataChar = await ftmsService.getCharacteristic(INDOOR_BIKE_DATA_CHAR_UUID);
        await bikeDataChar.startNotifications();
        bikeDataChar.addEventListener('characteristicvaluechanged', (e) => {
          const char = e.target as BluetoothRemoteGATTCharacteristic;
          if (char.value) {
            const parsed = this.parseIndoorBikeData(char.value);
            this.onDataCallback?.(parsed);
          }
        });
      } catch (err) {
        console.warn('Could not subscribe to Indoor Bike Data:', err);
      }

      try {
        this.controlPointChar = await ftmsService.getCharacteristic(FITNESS_MACHINE_CONTROL_POINT_CHAR_UUID);
        await this.controlPointChar.startNotifications();
        await this.requestControl();
      } catch (err) {
        console.warn('Could not setup Fitness Machine Control Point:', err);
      }
    } else {
      try {
        const cpsService = await this.webServer.getPrimaryService(CYCLING_POWER_SERVICE_UUID);
        const powerChar = await cpsService.getCharacteristic(CYCLING_POWER_MEASUREMENT_CHAR_UUID);
        await powerChar.startNotifications();
        powerChar.addEventListener('characteristicvaluechanged', (e) => {
          const char = e.target as BluetoothRemoteGATTCharacteristic;
          if (char.value) {
            const parsed = this.parseCyclingPower(char.value);
            this.onDataCallback?.(parsed);
          }
        });
      } catch (err) {
        throw new Error('Device does not have FTMS or Cycling Power Service');
      }
    }

    return this.webDevice.name || 'Smart Trainer';
  }

  /**
   * Request control of FTMS trainer (OpCode 0x00)
   */
  public async requestControl(): Promise<void> {
    if (this.isNative && this.nativeDeviceId && this.nativeServiceUuid) {
      try {
        const controlCharUuid = numberToUUID(FITNESS_MACHINE_CONTROL_POINT_CHAR_UUID);
        const buffer = new Uint8Array([0x00]);
        await BleClient.write(this.nativeDeviceId, this.nativeServiceUuid, controlCharUuid, new DataView(buffer.buffer));
      } catch {
        // Some trainers do not require explicit request
      }
      return;
    }

    if (!this.controlPointChar) return;
    try {
      const buffer = new Uint8Array([0x00]);
      await this.controlPointChar.writeValueWithResponse(buffer);
    } catch {
      // ignore
    }
  }

  /**
   * Set ERG mode target power in Watts (OpCode 0x05)
   */
  public async setTargetPower(targetWatts: number): Promise<boolean> {
    const clampedWatts = Math.max(0, Math.min(2500, Math.round(targetWatts)));
    const buffer = new Uint8Array(3);
    buffer[0] = 0x05;
    buffer[1] = clampedWatts & 0xff;
    buffer[2] = (clampedWatts >> 8) & 0xff;

    if (this.isNative) {
      if (!this.nativeDeviceId || !this.nativeServiceUuid) return false;
      try {
        const controlCharUuid = numberToUUID(FITNESS_MACHINE_CONTROL_POINT_CHAR_UUID);
        await BleClient.write(this.nativeDeviceId, this.nativeServiceUuid, controlCharUuid, new DataView(buffer.buffer));
        return true;
      } catch (err) {
        console.error('Failed to set native target power:', err);
        return false;
      }
    }

    if (!this.controlPointChar) return false;

    try {
      await this.controlPointChar.writeValueWithResponse(buffer);
      return true;
    } catch {
      try {
        await (this.controlPointChar as any).writeValueWithoutResponse(buffer);
        return true;
      } catch (err) {
        console.error('Failed to set target power on trainer:', err);
        return false;
      }
    }
  }

  /**
   * Parse FTMS Indoor Bike Data characteristic (0x2AD2)
   */
  private parseIndoorBikeData(dataView: DataView): TrainerDataUpdate {
    const result: TrainerDataUpdate = {};
    if (dataView.byteLength < 2) return result;

    const flags = dataView.getUint16(0, true);
    let offset = 2;

    const speedPresent = (flags & 0x0001) === 0;
    if (speedPresent && offset + 2 <= dataView.byteLength) {
      const rawSpeed = dataView.getUint16(offset, true);
      result.instantaneousSpeedKmh = Number((rawSpeed * 0.01).toFixed(1));
      offset += 2;
    }

    if (flags & 0x0002) offset += 2;

    if (flags & 0x0004 && offset + 2 <= dataView.byteLength) {
      const rawCadence = dataView.getUint16(offset, true);
      result.instantaneousCadence = Math.round(rawCadence * 0.5);
      offset += 2;
    }

    if (flags & 0x0008) offset += 2;

    if (flags & 0x0010 && offset + 3 <= dataView.byteLength) {
      const d0 = dataView.getUint8(offset);
      const d1 = dataView.getUint8(offset + 1);
      const d2 = dataView.getUint8(offset + 2);
      result.totalDistanceMeters = d0 | (d1 << 8) | (d2 << 16);
      offset += 3;
    }

    if (flags & 0x0020 && offset + 2 <= dataView.byteLength) {
      result.resistanceLevel = dataView.getInt16(offset, true);
      offset += 2;
    }

    if (flags & 0x0040 && offset + 2 <= dataView.byteLength) {
      result.instantaneousPower = Math.max(0, dataView.getInt16(offset, true));
      offset += 2;
    }

    if (flags & 0x0080) offset += 2;
    if (flags & 0x0100) offset += 5;

    if (flags & 0x0200 && offset < dataView.byteLength) {
      result.heartRate = dataView.getUint8(offset);
      offset += 1;
    }

    return result;
  }

  private parseCyclingPower(dataView: DataView): TrainerDataUpdate {
    const result: TrainerDataUpdate = {};
    if (dataView.byteLength < 4) return result;
    result.instantaneousPower = Math.max(0, dataView.getInt16(2, true));
    return result;
  }

  public disconnect(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.isNative && this.nativeDeviceId) {
      BleClient.disconnect(this.nativeDeviceId).catch(() => {});
      this.nativeDeviceId = null;
      this.nativeDeviceName = null;
      this.nativeServiceUuid = null;
    }

    if (this.webServer && this.webServer.connected) {
      this.webServer.disconnect();
    }
    this.webDevice = null;
    this.webServer = null;
    this.controlPointChar = null;
  }
}
