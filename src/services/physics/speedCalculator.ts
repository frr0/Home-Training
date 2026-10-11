import { UserSettings } from '../../types';

export interface PhysicsState {
  currentVelocityMps: number; // m/s
  currentVelocityKmh: number; // km/h
  currentVelocityMph: number; // mph
  steadyStateKmh: number;     // Theoretical steady-state km/h at current power
  acceleration: number;       // m/s^2
  totalDistanceMeters: number;// accumulated distance
}

export class CyclingPhysicsEngine {
  private velocityMps = 0;
  private totalDistanceMeters = 0;
  private lastUpdateTime = Date.now();

  constructor(private settings: UserSettings) {}

  public updateSettings(settings: UserSettings) {
    this.settings = settings;
  }

  public reset(distanceMeters = 0) {
    this.velocityMps = 0;
    this.totalDistanceMeters = distanceMeters;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Calculates steady-state speed (m/s) for a given power using Newton-Raphson
   */
  public calculateSteadyStateVelocity(powerWatts: number): number {
    if (powerWatts <= 0) return 0;

    const {
      riderWeightKg,
      bikeWeightKg,
      cda,
      crr,
      gradientPercent,
    } = this.settings;

    const totalMass = riderWeightKg + bikeWeightKg;
    const g = 9.80665;
    const rho = 1.225; // air density (kg/m^3)
    const efficiency = 0.97; // drivetrain efficiency
    const pPropulsive = powerWatts * efficiency;

    const slopeAngle = Math.atan(gradientPercent / 100);
    const fRolling = crr * totalMass * g * Math.cos(slopeAngle);
    const fGravity = totalMass * g * Math.sin(slopeAngle);
    const fLinear = fRolling + fGravity;

    // We want to solve f(v) = 0.5 * rho * cda * v^3 + fLinear * v - pPropulsive = 0
    let v = 7.0; // initial guess (~25 km/h)
    for (let i = 0; i < 25; i++) {
      const fv = 0.5 * rho * cda * Math.pow(v, 3) + fLinear * v - pPropulsive;
      const fPrime = 1.5 * rho * cda * Math.pow(v, 2) + fLinear;
      if (Math.abs(fPrime) < 1e-6) break;
      const nextV = v - fv / fPrime;
      if (Math.abs(nextV - v) < 1e-4) {
        v = nextV;
        break;
      }
      v = Math.max(0.01, nextV);
    }

    return Math.max(0, v);
  }

  /**
   * Updates dynamic physics simulation given power, cadence, and time delta (dt in seconds)
   */
  public step(
    powerWatts: number,
    cadenceRpm: number,
    deltaTimeSeconds?: number
  ): PhysicsState {
    const now = Date.now();
    const dt =
      deltaTimeSeconds !== undefined
        ? deltaTimeSeconds
        : Math.min(1.0, Math.max(0.01, (now - this.lastUpdateTime) / 1000));
    this.lastUpdateTime = now;

    const {
      riderWeightKg,
      bikeWeightKg,
      cda,
      crr,
      gradientPercent,
    } = this.settings;

    const totalMass = Math.max(30, riderWeightKg + bikeWeightKg);
    const g = 9.80665;
    const rho = 1.225;
    const efficiency = 0.97;

    // If cadence is 0 or power is negligible, rider is coasting
    const effectivePower = cadenceRpm > 0 ? Math.max(0, powerWatts) : 0;
    const pProp = effectivePower * efficiency;

    const slopeAngle = Math.atan(gradientPercent / 100);
    const fRolling = crr * totalMass * g * Math.cos(slopeAngle);
    const fGravity = totalMass * g * Math.sin(slopeAngle);
    const fAero = 0.5 * rho * cda * Math.pow(this.velocityMps, 2);

    // Drive force from pedaling
    const minVForDrive = 0.8; // prevents division by zero / astronomical force at standstill
    const fDrive = pProp / Math.max(this.velocityMps, minVForDrive);

    // Total net force
    const totalResistance = fRolling + fAero + fGravity;
    let fNet = fDrive - totalResistance;

    // If coasting on flat/uphill and velocity is low, clamp to stop
    if (effectivePower === 0 && this.velocityMps < 0.2 && fNet < 0) {
      this.velocityMps = 0;
      fNet = 0;
    }

    // Acceleration a = F / m
    const acceleration = fNet / totalMass;

    // Integrate velocity
    this.velocityMps = Math.max(0, this.velocityMps + acceleration * dt);

    // Cap unreasonable velocities
    if (this.velocityMps > 35) { // ~126 km/h
      this.velocityMps = 35;
    }

    // Integrate distance
    this.totalDistanceMeters += this.velocityMps * dt;

    const currentVelocityKmh = this.velocityMps * 3.6;
    const currentVelocityMph = this.velocityMps * 2.23694;
    const steadyStateVelocityMps = this.calculateSteadyStateVelocity(effectivePower);
    const steadyStateKmh = steadyStateVelocityMps * 3.6;

    return {
      currentVelocityMps: Number(this.velocityMps.toFixed(2)),
      currentVelocityKmh: Number(currentVelocityKmh.toFixed(1)),
      currentVelocityMph: Number(currentVelocityMph.toFixed(1)),
      steadyStateKmh: Number(steadyStateKmh.toFixed(1)),
      acceleration: Number(acceleration.toFixed(2)),
      totalDistanceMeters: Number(this.totalDistanceMeters.toFixed(1)),
    };
  }
}
