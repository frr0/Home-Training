import { JSDOM } from 'jsdom';

// Polyfill DOMParser for Node test environment
const dom = new JSDOM();
(globalThis as any).DOMParser = dom.window.DOMParser;

import { parseZwoWorkout, SAMPLE_WORKOUTS } from '../workout/zwoParser';
import { CyclingPhysicsEngine } from '../physics/speedCalculator';
import { generateFitFile } from '../fit/fitGenerator';
import { Decoder, Stream } from '@garmin/fitsdk';
import { SessionSummary, TelemetrySample, UserSettings } from '../../types';

async function runVerification() {
  console.log('=== 1. VERIFYING ZWO WORKOUT PARSER ===');
  const ftp = 250;
  const workout = parseZwoWorkout(SAMPLE_WORKOUTS[0].xml, ftp);
  console.log('Parsed Workout Title:', workout.title);
  console.log('Intervals Count:', workout.intervals.length);
  console.log('Total Duration (s):', workout.totalDurationSeconds);
  console.log('Estimated TSS:', workout.estimatedTss);
  console.log('Intensity Factor:', workout.intensityFactor);
  if (workout.intervals.length === 0 || workout.totalDurationSeconds <= 0) {
    throw new Error('Failed to parse workout');
  }

  console.log('\n=== 2. VERIFYING CYCLING PHYSICS ENGINE ===');
  const settings: UserSettings = {
    ftp: 250,
    riderWeightKg: 75,
    bikeWeightKg: 9,
    cda: 0.32,
    crr: 0.004,
    gradientPercent: 0,
    maxHeartRate: 190,
    restingHeartRate: 55,
    soundAlerts: true,
    speedSource: 'physics',
    wheelCircumferenceMm: 2105,
  };

  const physics = new CyclingPhysicsEngine(settings);
  // Steady 250W test
  let state = physics.step(250, 90, 1.0);
  for (let i = 0; i < 30; i++) {
    state = physics.step(250, 90, 1.0);
  }
  console.log('30s @ 250W Speed (km/h):', state.currentVelocityKmh);
  console.log('Steady state speed (km/h):', state.steadyStateKmh);
  console.log('Total Distance (m):', state.totalDistanceMeters);
  if (state.currentVelocityKmh < 20 || state.currentVelocityKmh > 50) {
    throw new Error(`Physics speed abnormal: ${state.currentVelocityKmh} km/h`);
  }

  console.log('\n=== 3. VERIFYING FIT FILE GENERATION & SPEC CONFORMANCE ===');
  const startTime = new Date(Date.now() - 60000);
  const endTime = new Date();

  const samples: TelemetrySample[] = [];
  for (let i = 0; i < 60; i++) {
    samples.push({
      timestamp: new Date(startTime.getTime() + i * 1000),
      elapsedSeconds: i,
      power: 200 + Math.sin(i) * 20,
      cadence: 88,
      heartRate: 142,
      speedMps: 8.5,
      distanceMeters: i * 8.5,
      targetPower: 200,
    });
  }

  const summary: SessionSummary = {
    startTime,
    endTime,
    totalElapsedTimeSeconds: 60,
    totalTimerTimeSeconds: 60,
    totalDistanceMeters: 510,
    avgPowerWatts: 200,
    maxPowerWatts: 220,
    normalizedPowerWatts: 202,
    avgCadenceRpm: 88,
    maxCadenceRpm: 92,
    avgHeartRateBpm: 142,
    maxHeartRateBpm: 148,
    avgSpeedKmh: 30.6,
    maxSpeedKmh: 31.0,
    totalWorkKj: 12.0,
    totalCaloriesKcal: 12.5,
    trainingStressScore: 1,
    intensityFactor: 0.8,
    samples,
  };

  const fitBytes = generateFitFile(summary);
  console.log('Generated FIT file bytes:', fitBytes.length);

  // Decode the generated FIT file with Garmin FIT Decoder
  const stream = Stream.fromByteArray(fitBytes);
  const decoder = new Decoder(stream);
  const { messages, errors } = decoder.read();

  console.log('FIT Decoder error count:', errors.length);
  if (errors.length > 0) {
    console.error('Decoding errors:', errors);
    throw new Error('FIT file had decoding errors');
  }

  console.log('FIT Decoded message groups:', Object.keys(messages));
  console.log('Record messages count:', messages.recordMesgs?.length);
  console.log('Session message:', messages.sessionMesgs?.[0]);

  if (!messages.fileIdMesgs || messages.fileIdMesgs.length === 0) {
    throw new Error('Missing fileIdMesgs in generated FIT file');
  }
  if (!messages.recordMesgs || messages.recordMesgs.length !== 60) {
    throw new Error(`Expected 60 record messages, got ${messages.recordMesgs?.length}`);
  }
  if (!messages.sessionMesgs || messages.sessionMesgs.length === 0) {
    throw new Error('Missing sessionMesgs in generated FIT file');
  }

  console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
