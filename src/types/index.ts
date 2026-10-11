export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface BluetoothDeviceInfo {
  connected: boolean;
  connecting: boolean;
  name?: string;
  id?: string;
  batteryLevel?: number;
  error?: string;
}

export interface BluetoothDevicesState {
  trainer: BluetoothDeviceInfo;
  cadence: BluetoothDeviceInfo;
  heartRate: BluetoothDeviceInfo;
  isSimulated: boolean;
}

export type PowerZoneNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PowerZone {
  zone: PowerZoneNumber;
  name: string;
  minPercent: number;
  maxPercent: number;
  minWatts: number;
  maxWatts: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface HeartRateZone {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  minPercent: number;
  maxPercent: number;
  minBpm: number;
  maxBpm: number;
  color: string;
}

export interface TelemetryData {
  power: number;              // Current instantaneous power (Watts)
  power3s: number;            // 3-second smoothed power (Watts)
  targetPower: number;        // ERG mode target power (Watts)
  cadence: number;            // Current cadence (RPM)
  targetCadence?: number;     // Workout target cadence (RPM)
  heartRate: number;          // Current Heart Rate (BPM)
  speedKmh: number;           // Instantaneous speed in km/h
  speedMps: number;           // Instantaneous speed in m/s
  speedMph: number;           // Instantaneous speed in mph
  trainerReportedSpeed?: number; // Speed reported directly by trainer (km/h)
  distanceMeters: number;     // Total distance in meters
  elapsedSeconds: number;     // Elapsed active workout time
  powerZone: PowerZoneNumber; // Current power zone (1-7)
  hrZone: number;             // Current HR zone (1-5)
  calories: number;           // Estimated kilocalories burned
  workKj: number;             // Total work in kilojoules
}

export type WorkoutIntervalType =
  | 'Warmup'
  | 'SteadyState'
  | 'IntervalsT'
  | 'Ramp'
  | 'Cooldown'
  | 'FreeRide'
  | 'MaxEffort';

export interface WorkoutInterval {
  id: string;
  type: WorkoutIntervalType;
  durationSeconds: number;
  startSecond: number;
  endSecond: number;
  powerLow: number;           // % of FTP (e.g. 0.75 for 75%)
  powerHigh: number;          // % of FTP (e.g. 1.05 for 105%)
  power: number;              // % of FTP if steady state
  targetWattsStart: number;
  targetWattsEnd: number;
  cadence?: number;
  cadenceLow?: number;
  cadenceHigh?: number;
  cadenceRest?: number;
  text?: string;
  colorZone?: PowerZoneNumber;
  repeatIndex?: number;
  totalRepeats?: number;
}

export interface ParsedWorkout {
  title: string;
  author: string;
  description: string;
  sportType: string;
  intervals: WorkoutInterval[];
  totalDurationSeconds: number;
  avgTargetPowerPercent: number;
  avgTargetWatts: number;
  normalizedTargetWatts: number;
  estimatedTss: number;
  intensityFactor: number;
  rawXml?: string;
}

export type SessionStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface TelemetrySample {
  timestamp: Date;
  elapsedSeconds: number;
  power: number;
  cadence: number;
  heartRate: number;
  speedMps: number;
  distanceMeters: number;
  targetPower: number;
}

export interface SessionSummary {
  startTime: Date;
  endTime: Date;
  totalElapsedTimeSeconds: number;
  totalTimerTimeSeconds: number;
  totalDistanceMeters: number;
  avgPowerWatts: number;
  maxPowerWatts: number;
  normalizedPowerWatts: number;
  avgCadenceRpm: number;
  maxCadenceRpm: number;
  avgHeartRateBpm: number;
  maxHeartRateBpm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  totalWorkKj: number;
  totalCaloriesKcal: number;
  trainingStressScore: number;
  intensityFactor: number;
  samples: TelemetrySample[];
}

export interface UserSettings {
  ftp: number;                // Functional Threshold Power (Watts, default 250)
  riderWeightKg: number;      // Rider weight in kg (default 75)
  bikeWeightKg: number;       // Bike + equipment weight in kg (default 9)
  cda: number;                // Drag area in m^2 (default 0.32)
  crr: number;                // Rolling resistance coefficient (default 0.004)
  gradientPercent: number;    // Virtual gradient (default 0%)
  maxHeartRate: number;       // Max heart rate for zones (default 190)
  restingHeartRate: number;   // Resting heart rate (default 55)
  soundAlerts: boolean;       // Enable interval countdown beeps
  speedSource: 'physics' | 'trainer'; // Physics calculated or trainer reported
  wheelCircumferenceMm: number; // For speed sensor wheel calculation (default 2105mm - 700x25c)
}
