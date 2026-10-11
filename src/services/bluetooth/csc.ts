import { Capacitor } from '@capacitor/core';
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import { ensureNativeBleReady } from './bleNative';

export const CSC_SERVICE_UUID = 0x1816;
export const CSC_MEASUREMENT_CHAR_UUID = 0x2a5b;

export interface CscDataUpdate {
  cadenceRpm?: number;
  wheelSpeedKmh?: number;
}

export class CadenceBluetoothService {
  // Web Bluetooth
  private webDevice: BluetoothDevice | null = null;
  private webServer: BluetoothRemoteGATTServer | null = null;

  // Native Capacitor BLE
  private nativeDeviceId: string | null = null;
  private nativeDeviceName: string | null = null;
  private isNative = Capacitor.isNativePlatform();

  private lastCrankRevs: number | null = null;
  private lastCrankEventTime: number | null = null;
  private lastCadenceUpdateTime = 0;
  private timeoutInterval: any = null;

  private onDataCallback: ((data: CscDataUpdate) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  public isConnected(): boolean {
    if (this.isNative) return !!this.nativeDeviceId;
    return !!(this.webServer && this.webServer.connected);
  }

  public getDeviceName(): string {
    if (this.isNative) return this.nativeDeviceName || 'Cadence Sensor';
    return this.webDevice?.name || 'Cadence Sensor';
  }

  public async connect(
    onData: (data: CscDataUpdate) => void,
    onDisconnect: () => void
  ): Promise<string> {
    this.onDataCallback = onData;
    this.onDisconnectCallback = onDisconnect;
    this.lastCrankRevs = null;
    this.lastCrankEventTime = null;

    if (this.isNative) {
      return await this.connectNative();
    } else {
      return await this.connectWeb();
    }
  }

  private async connectNative(): Promise<string> {
    await ensureNativeBleReady();

    const cscUuid = numberToUUID(CSC_SERVICE_UUID);
    const device = await BleClient.requestDevice({
      services: [cscUuid],
      optionalServices: [cscUuid, numberToUUID(0x180f)],
    });

    this.nativeDeviceId = device.deviceId;
    this.nativeDeviceName = device.name || 'Cadence Sensor';

    await BleClient.connect(device.deviceId, () => {
      this.cleanup();
      this.onDisconnectCallback?.();
    });

    const cscCharUuid = numberToUUID(CSC_MEASUREMENT_CHAR_UUID);
    await BleClient.startNotifications(
      device.deviceId,
      cscUuid,
      cscCharUuid,
      (value: DataView) => {
        this.parseCscMeasurement(value);
      }
    );

    this.setupWatchdog();
    return this.nativeDeviceName || 'Cadence Sensor';
  }

  private async connectWeb(): Promise<string> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not supported in this browser.');
    }

    this.webDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [CSC_SERVICE_UUID] }],
      optionalServices: [CSC_SERVICE_UUID, 0x180f],
    });

    this.webDevice.addEventListener('gattserverdisconnected', () => {
      this.cleanup();
      this.onDisconnectCallback?.();
    });

    if (!this.webDevice.gatt) {
      throw new Error('Device does not support GATT server');
    }

    this.webServer = await this.webDevice.gatt.connect();
    const service = await this.webServer.getPrimaryService(CSC_SERVICE_UUID);
    const char = await service.getCharacteristic(CSC_MEASUREMENT_CHAR_UUID);
    await char.startNotifications();

    char.addEventListener('characteristicvaluechanged', (e) => {
      const characteristic = e.target as BluetoothRemoteGATTCharacteristic;
      if (characteristic.value) {
        this.parseCscMeasurement(characteristic.value);
      }
    });

    this.setupWatchdog();
    return this.webDevice.name || 'Cadence Sensor';
  }

  private setupWatchdog(): void {
    if (this.timeoutInterval) clearInterval(this.timeoutInterval);
    this.timeoutInterval = setInterval(() => {
      if (Date.now() - this.lastCadenceUpdateTime > 2500 && this.lastCadenceUpdateTime > 0) {
        this.onDataCallback?.({ cadenceRpm: 0 });
      }
    }, 1000);
  }

  private parseCscMeasurement(dataView: DataView): void {
    if (dataView.byteLength < 1) return;

    const flags = dataView.getUint8(0);
    const wheelRevPresent = (flags & 0x01) !== 0;
    const crankRevPresent = (flags & 0x02) !== 0;

    let offset = 1;
    if (wheelRevPresent) offset += 6;

    if (crankRevPresent && offset + 4 <= dataView.byteLength) {
      const crankRevs = dataView.getUint16(offset, true);
      const crankEventTime = dataView.getUint16(offset + 2, true);

      if (this.lastCrankRevs !== null && this.lastCrankEventTime !== null) {
        let revsDelta = crankRevs - this.lastCrankRevs;
        if (revsDelta < 0) revsDelta += 65536;

        let timeDelta = crankEventTime - this.lastCrankEventTime;
        if (timeDelta < 0) timeDelta += 65536;

        const timeDeltaSeconds = timeDelta / 1024;
        if (timeDeltaSeconds > 0 && revsDelta > 0) {
          const rpm = Math.round((revsDelta / timeDeltaSeconds) * 60);
          if (rpm >= 0 && rpm <= 250) {
            this.lastCadenceUpdateTime = Date.now();
            this.onDataCallback?.({ cadenceRpm: rpm });
          }
        }
      }

      this.lastCrankRevs = crankRevs;
      this.lastCrankEventTime = crankEventTime;
    }
  }

  public disconnect(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
      this.timeoutInterval = null;
    }

    if (this.isNative && this.nativeDeviceId) {
      BleClient.disconnect(this.nativeDeviceId).catch(() => {});
      this.nativeDeviceId = null;
      this.nativeDeviceName = null;
    }

    if (this.webServer && this.webServer.connected) {
      this.webServer.disconnect();
    }
    this.webDevice = null;
    this.webServer = null;
    this.lastCrankRevs = null;
    this.lastCrankEventTime = null;
  }
}
