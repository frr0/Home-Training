import { ParsedWorkout, WorkoutInterval, SessionStatus } from '../../types';

export interface WorkoutEngineState {
  status: SessionStatus;
  currentIntervalIndex: number;
  currentInterval: WorkoutInterval | null;
  nextInterval: WorkoutInterval | null;
  intervalElapsedSeconds: number;
  intervalRemainingSeconds: number;
  workoutElapsedSeconds: number;
  workoutRemainingSeconds: number;
  instantaneousTargetPower: number;
  instantaneousTargetCadence?: number;
  ergBiasPercent: number; // 100 = 100%
  intervalProgressPercent: number;
  workoutProgressPercent: number;
  intervalTextPrompt?: string;
}

export class WorkoutEngine {
  private workout: ParsedWorkout | null = null;
  private ftp = 250;
  private status: SessionStatus = 'idle';
  private ergBiasPercent = 100;

  private workoutElapsedSeconds = 0;
  private currentIntervalIndex = 0;
  private intervalElapsedSeconds = 0;

  // Web Audio Context for beeps
  private audioCtx: AudioContext | null = null;
  private soundEnabled = true;

  // Callbacks
  private onStateChange: ((state: WorkoutEngineState) => void) | null = null;
  private onTargetPowerChange: ((targetWatts: number) => void) | null = null;
  private onFinished: (() => void) | null = null;

  constructor(ftp: number, soundEnabled = true) {
    this.ftp = ftp;
    this.soundEnabled = soundEnabled;
  }

  public setCallbacks(
    onStateChange: (state: WorkoutEngineState) => void,
    onTargetPowerChange: (targetWatts: number) => void,
    onFinished: () => void
  ) {
    this.onStateChange = onStateChange;
    this.onTargetPowerChange = onTargetPowerChange;
    this.onFinished = onFinished;
  }

  public setFtp(ftp: number) {
    this.ftp = ftp;
    if (this.workout) {
      this.recalculateCurrentTarget();
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public loadWorkout(workout: ParsedWorkout) {
    this.workout = workout;
    this.reset();
  }

  public clearWorkout() {
    this.workout = null;
    this.reset();
  }

  public start() {
    if (this.status === 'idle') {
      this.workoutElapsedSeconds = 0;
      this.currentIntervalIndex = 0;
      this.intervalElapsedSeconds = 0;
    }
    this.status = 'running';
    this.initAudio();
    this.playTone(880, 0.15, 'triangle');
    this.recalculateCurrentTarget();
    this.emitState();
  }

  public pause() {
    if (this.status === 'running') {
      this.status = 'paused';
      this.emitState();
    }
  }

  public resume() {
    if (this.status === 'paused') {
      this.status = 'running';
      this.recalculateCurrentTarget();
      this.emitState();
    }
  }

  public stop() {
    this.status = 'idle';
    this.reset();
    this.emitState();
  }

  public finish() {
    this.status = 'finished';
    this.playTone(1320, 0.4, 'sine');
    this.emitState();
    this.onFinished?.();
  }

  public reset() {
    this.workoutElapsedSeconds = 0;
    this.currentIntervalIndex = 0;
    this.intervalElapsedSeconds = 0;
    this.recalculateCurrentTarget();
  }

  public adjustErgBias(deltaPercent: number) {
    this.ergBiasPercent = Math.max(50, Math.min(150, this.ergBiasPercent + deltaPercent));
    this.recalculateCurrentTarget();
    this.emitState();
  }

  public setErgBias(biasPercent: number) {
    this.ergBiasPercent = Math.max(50, Math.min(150, biasPercent));
    this.recalculateCurrentTarget();
    this.emitState();
  }

  public skipInterval(forward = true) {
    if (!this.workout || this.workout.intervals.length === 0) return;

    if (forward) {
      if (this.currentIntervalIndex < this.workout.intervals.length - 1) {
        this.currentIntervalIndex++;
        this.intervalElapsedSeconds = 0;
      } else {
        this.finish();
        return;
      }
    } else {
      if (this.intervalElapsedSeconds > 5) {
        this.intervalElapsedSeconds = 0;
      } else if (this.currentIntervalIndex > 0) {
        this.currentIntervalIndex--;
        this.intervalElapsedSeconds = 0;
      }
    }

    // Sync workout elapsed seconds with interval start
    const cur = this.workout.intervals[this.currentIntervalIndex];
    if (cur) {
      this.workoutElapsedSeconds = cur.startSecond;
    }

    this.recalculateCurrentTarget();
    this.emitState();
  }

  /**
   * Tick called every 1 second during active workout
   */
  public tick(): void {
    if (this.status !== 'running') return;

    this.workoutElapsedSeconds++;
    this.intervalElapsedSeconds++;

    if (this.workout && this.workout.intervals.length > 0) {
      const currentInterval = this.workout.intervals[this.currentIntervalIndex];

      if (currentInterval) {
        const remaining = currentInterval.durationSeconds - this.intervalElapsedSeconds;

        // Sound countdown: 3, 2, 1
        if (remaining <= 3 && remaining > 0) {
          this.playTone(587.33, 0.1, 'sine'); // D5
        } else if (remaining === 0) {
          this.playTone(1174.66, 0.25, 'sine'); // D6 (change interval)
        }

        // Interval finished
        if (this.intervalElapsedSeconds >= currentInterval.durationSeconds) {
          if (this.currentIntervalIndex < this.workout.intervals.length - 1) {
            this.currentIntervalIndex++;
            this.intervalElapsedSeconds = 0;
          } else {
            // Whole workout complete
            this.finish();
            return;
          }
        }
      }
    }

    this.recalculateCurrentTarget();
    this.emitState();
  }

  private recalculateCurrentTarget(): void {
    const targetWatts = this.calculateInstantaneousTargetWatts();
    this.onTargetPowerChange?.(targetWatts);
  }

  public calculateInstantaneousTargetWatts(): number {
    if (!this.workout || this.workout.intervals.length === 0) {
      return Math.round((this.ftp * 0.65 * this.ergBiasPercent) / 100);
    }

    const currentInterval = this.workout.intervals[this.currentIntervalIndex];
    if (!currentInterval) return 0;

    let targetWatts: number;

    if (currentInterval.type === 'Warmup' || currentInterval.type === 'Ramp' || currentInterval.type === 'Cooldown') {
      const fraction = currentInterval.durationSeconds > 0
        ? Math.min(1, Math.max(0, this.intervalElapsedSeconds / currentInterval.durationSeconds))
        : 0;
      const interpolatedPower = currentInterval.powerLow + fraction * (currentInterval.powerHigh - currentInterval.powerLow);
      targetWatts = interpolatedPower * this.ftp;
    } else {
      targetWatts = currentInterval.power * this.ftp;
    }

    // Apply ERG bias
    return Math.max(0, Math.round((targetWatts * this.ergBiasPercent) / 100));
  }

  public getState(): WorkoutEngineState {
    const curInterval = this.workout ? this.workout.intervals[this.currentIntervalIndex] || null : null;
    const nextInterval = this.workout && this.workout.intervals[this.currentIntervalIndex + 1]
      ? this.workout.intervals[this.currentIntervalIndex + 1]
      : null;

    const intervalDuration = curInterval ? curInterval.durationSeconds : 0;
    const intervalRemaining = Math.max(0, intervalDuration - this.intervalElapsedSeconds);
    const totalDuration = this.workout ? this.workout.totalDurationSeconds : 0;
    const workoutRemaining = Math.max(0, totalDuration - this.workoutElapsedSeconds);

    const intervalProgress = intervalDuration > 0
      ? Math.min(100, (this.intervalElapsedSeconds / intervalDuration) * 100)
      : 0;
    const workoutProgress = totalDuration > 0
      ? Math.min(100, (this.workoutElapsedSeconds / totalDuration) * 100)
      : 0;

    return {
      status: this.status,
      currentIntervalIndex: this.currentIntervalIndex,
      currentInterval: curInterval,
      nextInterval,
      intervalElapsedSeconds: this.intervalElapsedSeconds,
      intervalRemainingSeconds: intervalRemaining,
      workoutElapsedSeconds: this.workoutElapsedSeconds,
      workoutRemainingSeconds: workoutRemaining,
      instantaneousTargetPower: this.calculateInstantaneousTargetWatts(),
      instantaneousTargetCadence: curInterval?.cadence,
      ergBiasPercent: this.ergBiasPercent,
      intervalProgressPercent: intervalProgress,
      workoutProgressPercent: workoutProgress,
      intervalTextPrompt: curInterval?.text,
    };
  }

  private emitState(): void {
    this.onStateChange?.(this.getState());
  }

  // --- AUDIO SYNTHESIZER ---
  private initAudio(): void {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Audio autoplay policy or device sound mute
    }
  }
}
