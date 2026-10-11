import { Capacitor } from '@capacitor/core';
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import { ensureNativeBleReady } from './bleNative';

export const HEART_RATE_SERVICE_UUID = 0x180d;
export const HEART_RATE_MEASUREMENT_CHAR_UUID = 0x2a37;

export interface HeartRateDataUpdate {
  heartRateBpm: number;
  contactDetected?: boolean;
}

export class HeartRateBluetoothService {
  // Web Bluetooth
  private webDevice: BluetoothDevice | null = null;
  private webServer: BluetoothRemoteGATTServer | null = null;

  // Native Capacitor BLE
  private nativeDeviceId: string | null = null;
  private nativeDeviceName: string | null = null;
  private isNative = Capacitor.isNativePlatform();

  private onDataCallback: ((data: HeartRateDataUpdate) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  public isConnected(): boolean {
    if (this.isNative) return !!this.nativeDeviceId;
    return !!(this.webServer && this.webServer.connected);
  }

  public getDeviceName(): string {
    if (this.isNative) return this.nativeDeviceName || 'Heart Rate Monitor';
    return this.webDevice?.name || 'Heart Rate Monitor';
  }

  public async connect(
    onData: (data: HeartRateDataUpdate) => void,
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

  private async connectNative(): Promise<string> {
    await ensureNativeBleReady();

    const hrUuid = numberToUUID(HEART_RATE_SERVICE_UUID);
    const device = await BleClient.requestDevice({
      services: [hrUuid],
      optionalServices: [hrUuid, numberToUUID(0x180f)],
    });

    this.nativeDeviceId = device.deviceId;
    this.nativeDeviceName = device.name || 'Heart Rate Monitor';

    await BleClient.connect(device.deviceId, () => {
      this.cleanup();
      this.onDisconnectCallback?.();
    });

    const hrCharUuid = numberToUUID(HEART_RATE_MEASUREMENT_CHAR_UUID);
    await BleClient.startNotifications(
      device.deviceId,
      hrUuid,
      hrCharUuid,
      (value: DataView) => {
        this.parseHeartRateMeasurement(value);
      }
    );

    return this.nativeDeviceName || 'Heart Rate Monitor';
  }

  private async connectWeb(): Promise<string> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not supported in this browser.');
    }

    this.webDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE_UUID] }],
      optionalServices: [HEART_RATE_SERVICE_UUID, 0x180f],
    });

    this.webDevice.addEventListener('gattserverdisconnected', () => {
      this.cleanup();
      this.onDisconnectCallback?.();
    });

    if (!this.webDevice.gatt) {
      throw new Error('Device does not support GATT server');
    }

    this.webServer = await this.webDevice.gatt.connect();
    const service = await this.webServer.getPrimaryService(HEART_RATE_SERVICE_UUID);
    const char = await service.getCharacteristic(HEART_RATE_MEASUREMENT_CHAR_UUID);
    await char.startNotifications();

    char.addEventListener('characteristicvaluechanged', (e) => {
      const characteristic = e.target as BluetoothRemoteGATTCharacteristic;
      if (characteristic.value) {
        this.parseHeartRateMeasurement(characteristic.value);
      }
    });

    return this.webDevice.name || 'Heart Rate Monitor';
  }

  private parseHeartRateMeasurement(dataView: DataView): void {
    if (dataView.byteLength < 2) return;

    const flags = dataView.getUint8(0);
    const is16Bit = (flags & 0x01) !== 0;

    let heartRate: number;
    if (is16Bit && dataView.byteLength >= 3) {
      heartRate = dataView.getUint16(1, true);
    } else {
      heartRate = dataView.getUint8(1);
    }

    const contactSensorSupported = (flags & 0x04) !== 0;
    const contactDetected = contactSensorSupported ? (flags & 0x02) !== 0 : undefined;

    if (heartRate > 0 && heartRate < 250) {
      this.onDataCallback?.({
        heartRateBpm: heartRate,
        contactDetected,
      });
    }
  }

  public disconnect(): void {
    this.cleanup();
  }

  private cleanup(): void {
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
  }
}
