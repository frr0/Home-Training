import { TrainerDataUpdate } from './ftms';
import { CscDataUpdate } from './csc';
import { HeartRateDataUpdate } from './heartRate';

export class MockBluetoothService {
  private active = false;
  private timer: any = null;
  private currentPower = 180;
  private targetPower = 180;
  private currentCadence = 88;
  private currentHeartRate = 135;

  private onTrainerData: ((data: TrainerDataUpdate) => void) | null = null;
  private onCadenceData: ((data: CscDataUpdate) => void) | null = null;
  private onHeartRateData: ((data: HeartRateDataUpdate) => void) | null = null;

  public start(
    onTrainer: (data: TrainerDataUpdate) => void,
    onCadence: (data: CscDataUpdate) => void,
    onHeartRate: (data: HeartRateDataUpdate) => void
  ) {
    this.active = true;
    this.onTrainerData = onTrainer;
    this.onCadenceData = onCadence;
    this.onHeartRateData = onHeartRate;

    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public setTargetPower(watts: number) {
    this.targetPower = Math.max(50, Math.min(600, watts));
  }

  private tick() {
    if (!this.active) return;

    // Smoothly converge towards target power with realistic pedal stroke variance (+/- 3-5%)
    const diff = this.targetPower - this.currentPower;
    this.currentPower += diff * 0.35;
    const noise = (Math.random() - 0.5) * 8;
    const simulatedPower = Math.max(0, Math.round(this.currentPower + noise));

    // Cadence responds naturally
    const cadenceNoise = (Math.random() - 0.5) * 3;
    this.currentCadence = Math.round(Math.max(75, Math.min(105, 88 + (simulatedPower > 250 ? 4 : 0) + cadenceNoise)));

    // HR tracks effort with cardiac lag
    // Target HR proportional to power
    const estimatedTargetHr = Math.min(185, Math.max(100, 110 + (simulatedPower / 250) * 45));
    const hrDiff = estimatedTargetHr - this.currentHeartRate;
    this.currentHeartRate += hrDiff * 0.08 + (Math.random() - 0.5) * 1.5;
    const simulatedHr = Math.round(this.currentHeartRate);

    this.onTrainerData?.({
      instantaneousPower: simulatedPower,
      instantaneousCadence: this.currentCadence,
    });

    this.onCadenceData?.({
      cadenceRpm: this.currentCadence,
    });

    this.onHeartRateData?.({
      heartRateBpm: simulatedHr,
    });
  }

  public stop() {
    this.active = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public isSimulating(): boolean {
    return this.active;
  }
}
