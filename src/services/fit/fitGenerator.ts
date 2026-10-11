import { Encoder, Profile } from '@garmin/fitsdk';
import { SessionSummary } from '../../types';

export function generateFitFile(summary: SessionSummary): Uint8Array {
  const encoder = new Encoder();

  const startTime = summary.startTime || new Date();
  const endTime = summary.endTime || new Date();

  // 1. File ID Message
  encoder.onMesg(Profile.MesgNum.FILE_ID, {
    type: 'activity',
    manufacturer: 'development',
    product: 1,
    serialNumber: Math.floor(startTime.getTime() / 1000),
    timeCreated: startTime,
  } as any);

  // 2. Timer Start Event
  encoder.onMesg(Profile.MesgNum.EVENT, {
    timestamp: startTime,
    event: 'timer',
    eventType: 'start',
  } as any);

  // 3. Record Messages (one per recorded second)
  if (summary.samples && summary.samples.length > 0) {
    summary.samples.forEach((sample) => {
      const recordMesg: Record<string, any> = {
        timestamp: sample.timestamp,
        distance: Number(sample.distanceMeters.toFixed(1)),
        speed: Number(sample.speedMps.toFixed(2)),
        power: Math.round(sample.power),
      };

      if (sample.heartRate > 0) {
        recordMesg.heartRate = Math.round(sample.heartRate);
      }

      if (sample.cadence > 0) {
        recordMesg.cadence = Math.round(sample.cadence);
      }

      encoder.onMesg(Profile.MesgNum.RECORD, recordMesg as any);
    });
  } else {
    // If no samples (e.g. immediate stop), write at least 1 record
    encoder.onMesg(Profile.MesgNum.RECORD, {
      timestamp: startTime,
      distance: 0,
      speed: 0,
      power: 0,
    } as any);
  }

  // 4. Timer Stop Event
  encoder.onMesg(Profile.MesgNum.EVENT, {
    timestamp: endTime,
    event: 'timer',
    eventType: 'stopAll',
  } as any);

  // 5. Lap Message
  encoder.onMesg(Profile.MesgNum.LAP, {
    timestamp: endTime,
    startTime: startTime,
    totalElapsedTime: summary.totalElapsedTimeSeconds,
    totalTimerTime: summary.totalTimerTimeSeconds,
    totalDistance: Number(summary.totalDistanceMeters.toFixed(1)),
    avgSpeed: Number((summary.avgSpeedKmh / 3.6).toFixed(2)),
    maxSpeed: Number((summary.maxSpeedKmh / 3.6).toFixed(2)),
    avgPower: Math.round(summary.avgPowerWatts),
    maxPower: Math.round(summary.maxPowerWatts),
    avgHeartRate: Math.round(summary.avgHeartRateBpm) || undefined,
    maxHeartRate: Math.round(summary.maxHeartRateBpm) || undefined,
    avgCadence: Math.round(summary.avgCadenceRpm) || undefined,
    maxCadence: Math.round(summary.maxCadenceRpm) || undefined,
    totalWork: Math.round(summary.totalWorkKj * 1000), // Joules in FIT
    totalCalories: Math.round(summary.totalCaloriesKcal),
  } as any);

  // 6. Session Message
  encoder.onMesg(Profile.MesgNum.SESSION, {
    timestamp: endTime,
    startTime: startTime,
    sport: 'cycling',
    subSport: 'indoorCycling',
    totalElapsedTime: summary.totalElapsedTimeSeconds,
    totalTimerTime: summary.totalTimerTimeSeconds,
    totalDistance: Number(summary.totalDistanceMeters.toFixed(1)),
    avgSpeed: Number((summary.avgSpeedKmh / 3.6).toFixed(2)),
    maxSpeed: Number((summary.maxSpeedKmh / 3.6).toFixed(2)),
    avgPower: Math.round(summary.avgPowerWatts),
    maxPower: Math.round(summary.maxPowerWatts),
    normalizedPower: Math.round(summary.normalizedPowerWatts) || undefined,
    avgHeartRate: Math.round(summary.avgHeartRateBpm) || undefined,
    maxHeartRate: Math.round(summary.maxHeartRateBpm) || undefined,
    avgCadence: Math.round(summary.avgCadenceRpm) || undefined,
    maxCadence: Math.round(summary.maxCadenceRpm) || undefined,
    totalWork: Math.round(summary.totalWorkKj * 1000), // Joules
    totalCalories: Math.round(summary.totalCaloriesKcal),
    trainingStressScore: summary.trainingStressScore || undefined,
    intensityFactor: summary.intensityFactor || undefined,
  } as any);

  // 7. Activity Message
  encoder.onMesg(Profile.MesgNum.ACTIVITY, {
    timestamp: endTime,
    totalTimerTime: summary.totalTimerTimeSeconds,
    numSessions: 1,
    type: 'manual',
  } as any);

  return encoder.close();
}

/**
 * Generates and triggers browser download of the .fit file
 */
export function downloadFitFile(summary: SessionSummary, customFilename?: string): { filename: string; blobUrl: string } {
  const fitData = generateFitFile(summary);
  const blob = new Blob([fitData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const pad = (n: number) => String(n).padStart(2, '0');
  const d = summary.startTime || new Date();
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  const filename = customFilename || `VeloTrain_${dateStr}.fit`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { filename, blobUrl: url };
}

