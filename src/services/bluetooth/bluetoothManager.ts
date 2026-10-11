import { TrainerBluetoothService, TrainerDataUpdate } from './ftms';
import { CadenceBluetoothService, CscDataUpdate } from './csc';
import { HeartRateBluetoothService, HeartRateDataUpdate } from './heartRate';
import { MockBluetoothService } from './mockBluetooth';
import { BluetoothDevicesState } from '../../types';

export interface TelemetryEvent {
  power?: number;
  cadence?: number;
  heartRate?: number;
  trainerSpeedKmh?: number;
}

export class BluetoothManager {
  private trainerService = new TrainerBluetoothService();
  private cadenceService = new CadenceBluetoothService();
  private hrService = new HeartRateBluetoothService();
  private mockService = new MockBluetoothService();

  private devicesState: BluetoothDevicesState = {
    trainer: { connected: false, connecting: false },
    cadence: { connected: false, connecting: false },
    heartRate: { connected: false, connecting: false },
    isSimulated: false,
  };

  private onStateChangeCallback: ((state: BluetoothDevicesState) => void) | null = null;
  private onTelemetryCallback: ((data: TelemetryEvent) => void) | null = null;

  public setOnStateChange(cb: (state: BluetoothDevicesState) => void) {
    this.onStateChangeCallback = cb;
  }

  public setOnTelemetry(cb: (data: TelemetryEvent) => void) {
    this.onTelemetryCallback = cb;
  }

  public getState(): BluetoothDevicesState {
    return { ...this.devicesState };
  }

  private notifyStateChange() {
    this.onStateChangeCallback?.({ ...this.devicesState });
  }

  // --- TRAINER ---
  public async connectTrainer(): Promise<void> {
    if (this.devicesState.isSimulated) {
      this.stopSimulation();
    }

    this.devicesState.trainer.connecting = true;
    this.devicesState.trainer.error = undefined;
    this.notifyStateChange();

    try {
      const name = await this.trainerService.connect(
        (data: TrainerDataUpdate) => {
          this.onTelemetryCallback?.({
            power: data.instantaneousPower,
            cadence: data.instantaneousCadence,
            trainerSpeedKmh: data.instantaneousSpeedKmh,
            heartRate: data.heartRate,
          });
        },
        () => {
          this.devicesState.trainer.connected = false;
          this.devicesState.trainer.connecting = false;
          this.notifyStateChange();
        }
      );

      this.devicesState.trainer.connected = true;
      this.devicesState.trainer.connecting = false;
      this.devicesState.trainer.name = name;
      this.notifyStateChange();
    } catch (err: any) {
      this.devicesState.trainer.connecting = false;
      this.devicesState.trainer.connected = false;
      this.devicesState.trainer.error = err?.message || 'Connection failed';
      this.notifyStateChange();
      throw err;
    }
  }

  public disconnectTrainer(): void {
    this.trainerService.disconnect();
    this.devicesState.trainer.connected = false;
    this.devicesState.trainer.connecting = false;
    this.devicesState.trainer.name = undefined;
    this.notifyStateChange();
  }

  // --- CADENCE SENSOR ---
  public async connectCadence(): Promise<void> {
    if (this.devicesState.isSimulated) {
      this.stopSimulation();
    }

    this.devicesState.cadence.connecting = true;
    this.devicesState.cadence.error = undefined;
    this.notifyStateChange();

    try {
      const name = await this.cadenceService.connect(
        (data: CscDataUpdate) => {
          if (data.cadenceRpm !== undefined) {
            this.onTelemetryCallback?.({ cadence: data.cadenceRpm });
          }
        },
        () => {
          this.devicesState.cadence.connected = false;
          this.devicesState.cadence.connecting = false;
          this.notifyStateChange();
        }
      );

      this.devicesState.cadence.connected = true;
      this.devicesState.cadence.connecting = false;
      this.devicesState.cadence.name = name;
      this.notifyStateChange();
    } catch (err: any) {
      this.devicesState.cadence.connecting = false;
      this.devicesState.cadence.connected = false;
      this.devicesState.cadence.error = err?.message || 'Connection failed';
      this.notifyStateChange();
      throw err;
    }
  }

  public disconnectCadence(): void {
    this.cadenceService.disconnect();
    this.devicesState.cadence.connected = false;
    this.devicesState.cadence.connecting = false;
    this.devicesState.cadence.name = undefined;
    this.notifyStateChange();
  }

  // --- HEART RATE SENSOR ---
  public async connectHeartRate(): Promise<void> {
    if (this.devicesState.isSimulated) {
      this.stopSimulation();
    }

    this.devicesState.heartRate.connecting = true;
    this.devicesState.heartRate.error = undefined;
    this.notifyStateChange();

    try {
      const name = await this.hrService.connect(
        (data: HeartRateDataUpdate) => {
          this.onTelemetryCallback?.({ heartRate: data.heartRateBpm });
        },
        () => {
          this.devicesState.heartRate.connected = false;
          this.devicesState.heartRate.connecting = false;
          this.notifyStateChange();
        }
      );

      this.devicesState.heartRate.connected = true;
      this.devicesState.heartRate.connecting = false;
      this.devicesState.heartRate.name = name;
      this.notifyStateChange();
    } catch (err: any) {
      this.devicesState.heartRate.connecting = false;
      this.devicesState.heartRate.connected = false;
      this.devicesState.heartRate.error = err?.message || 'Connection failed';
      this.notifyStateChange();
      throw err;
    }
  }

  public disconnectHeartRate(): void {
    this.hrService.disconnect();
    this.devicesState.heartRate.connected = false;
    this.devicesState.heartRate.connecting = false;
    this.devicesState.heartRate.name = undefined;
    this.notifyStateChange();
  }

  // --- TARGET POWER (ERG MODE) ---
  public async setTargetPower(watts: number): Promise<boolean> {
    if (this.devicesState.isSimulated) {
      this.mockService.setTargetPower(watts);
      return true;
    }

    if (this.trainerService.isConnected()) {
      return await this.trainerService.setTargetPower(watts);
    }
    return false;
  }

  // --- SIMULATION / DEMO MODE ---
  public toggleSimulation(): void {
    if (this.devicesState.isSimulated) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }

  public startSimulation(): void {
    this.disconnectTrainer();
    this.disconnectCadence();
    this.disconnectHeartRate();

    this.devicesState.isSimulated = true;
    this.devicesState.trainer = { connected: true, connecting: false, name: 'Smart Trainer (Simulated)' };
    this.devicesState.cadence = { connected: true, connecting: false, name: 'Cadence Sensor (Simulated)' };
    this.devicesState.heartRate = { connected: true, connecting: false, name: 'HR Monitor (Simulated)' };
    this.notifyStateChange();

    this.mockService.start(
      (data) => {
        this.onTelemetryCallback?.({
          power: data.instantaneousPower,
          cadence: data.instantaneousCadence,
        });
      },
      (data) => {
        if (data.cadenceRpm !== undefined) {
          this.onTelemetryCallback?.({ cadence: data.cadenceRpm });
        }
      },
      (data) => {
        this.onTelemetryCallback?.({ heartRate: data.heartRateBpm });
      }
    );
  }

  public stopSimulation(): void {
    this.mockService.stop();
    this.devicesState.isSimulated = false;
    this.devicesState.trainer = { connected: false, connecting: false };
    this.devicesState.cadence = { connected: false, connecting: false };
    this.devicesState.heartRate = { connected: false, connecting: false };
    this.notifyStateChange();
  }
}
