import { ParsedWorkout, WorkoutInterval, WorkoutIntervalType } from '../../types';
import { getPowerZoneNumber } from '../../utils/zones';

export function parseZwoWorkout(xmlContent: string, ftp: number): ParsedWorkout {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid XML file: ' + (parserError.textContent || 'Parse error'));
  }

  const title = doc.querySelector('name')?.textContent?.trim() || 'Custom Workout';
  const author = doc.querySelector('author')?.textContent?.trim() || 'Unknown Author';
  const description = doc.querySelector('description')?.textContent?.trim() || 'No description provided';
  const sportType = doc.querySelector('sportType')?.textContent?.trim() || 'bike';

  const workoutNode = doc.querySelector('workout');
  if (!workoutNode) {
    throw new Error('No <workout> element found in the .zwo file');
  }

  const intervals: WorkoutInterval[] = [];
  let currentSecond = 0;

  const children = Array.from(workoutNode.children);

  children.forEach((node, nodeIdx) => {
    const tagName = node.tagName.toLowerCase();

    const parseNum = (attr: string, def = 0): number => {
      const v = node.getAttribute(attr);
      if (v === null || v === undefined) return def;
      const num = parseFloat(v);
      return isNaN(num) ? def : num;
    };

    if (tagName === 'warmup') {
      const duration = Math.round(parseNum('Duration', 600));
      const pLow = parseNum('PowerLow', 0.4);
      const pHigh = parseNum('PowerHigh', 0.75);
      const cadence = parseNum('Cadence', 0) || undefined;

      intervals.push(createInterval({
        id: `warmup-${nodeIdx}`,
        type: 'Warmup',
        durationSeconds: duration,
        startSecond: currentSecond,
        powerLow: pLow,
        powerHigh: pHigh,
        power: (pLow + pHigh) / 2,
        ftp,
        cadence,
        text: 'Warm-up: gradually raise heart rate and spin legs',
      }));
      currentSecond += duration;
    } else if (tagName === 'steadystate') {
      const duration = Math.round(parseNum('Duration', 300));
      const p = parseNum('Power', 0.85);
      const cadence = parseNum('Cadence', 0) || undefined;

      intervals.push(createInterval({
        id: `steady-${nodeIdx}`,
        type: 'SteadyState',
        durationSeconds: duration,
        startSecond: currentSecond,
        powerLow: p,
        powerHigh: p,
        power: p,
        ftp,
        cadence,
      }));
      currentSecond += duration;
    } else if (tagName === 'intervalst') {
      const repeats = Math.max(1, Math.round(parseNum('Repeat', 1)));
      const onDuration = Math.round(parseNum('OnDuration', 60));
      const offDuration = Math.round(parseNum('OffDuration', 60));
      const onPower = parseNum('OnPower', 1.0);
      const offPower = parseNum('OffPower', 0.5);
      const onCadence = parseNum('Cadence', 0) || undefined;
      const offCadence = parseNum('CadenceRest', 0) || undefined;

      for (let r = 1; r <= repeats; r++) {
        // ON interval
        intervals.push(createInterval({
          id: `intervals-on-${nodeIdx}-${r}`,
          type: 'IntervalsT',
          durationSeconds: onDuration,
          startSecond: currentSecond,
          powerLow: onPower,
          powerHigh: onPower,
          power: onPower,
          ftp,
          cadence: onCadence,
          repeatIndex: r,
          totalRepeats: repeats,
          text: `Interval ${r}/${repeats}: ON`,
        }));
        currentSecond += onDuration;

        // OFF interval
        intervals.push(createInterval({
          id: `intervals-off-${nodeIdx}-${r}`,
          type: 'IntervalsT',
          durationSeconds: offDuration,
          startSecond: currentSecond,
          powerLow: offPower,
          powerHigh: offPower,
          power: offPower,
          ftp,
          cadence: offCadence,
          repeatIndex: r,
          totalRepeats: repeats,
          text: `Interval ${r}/${repeats}: Rest & Spin`,
        }));
        currentSecond += offDuration;
      }
    } else if (tagName === 'ramp') {
      const duration = Math.round(parseNum('Duration', 300));
      const pLow = parseNum('PowerLow', 0.7);
      const pHigh = parseNum('PowerHigh', 1.1);
      const cadence = parseNum('Cadence', 0) || undefined;

      intervals.push(createInterval({
        id: `ramp-${nodeIdx}`,
        type: 'Ramp',
        durationSeconds: duration,
        startSecond: currentSecond,
        powerLow: pLow,
        powerHigh: pHigh,
        power: (pLow + pHigh) / 2,
        ftp,
        cadence,
      }));
      currentSecond += duration;
    } else if (tagName === 'cooldown') {
      const duration = Math.round(parseNum('Duration', 300));
      const pLow = parseNum('PowerLow', 0.7);
      const pHigh = parseNum('PowerHigh', 0.4);
      const cadence = parseNum('Cadence', 0) || undefined;

      intervals.push(createInterval({
        id: `cooldown-${nodeIdx}`,
        type: 'Cooldown',
        durationSeconds: duration,
        startSecond: currentSecond,
        powerLow: pLow,
        powerHigh: pHigh,
        power: (pLow + pHigh) / 2,
        ftp,
        cadence,
        text: 'Cool-down: ease down spin and recover',
      }));
      currentSecond += duration;
    } else if (tagName === 'freeride') {
      const duration = Math.round(parseNum('Duration', 600));
      intervals.push(createInterval({
        id: `freeride-${nodeIdx}`,
        type: 'FreeRide',
        durationSeconds: duration,
        startSecond: currentSecond,
        powerLow: 0.65,
        powerHigh: 0.65,
        power: 0.65,
        ftp,
        text: 'Free Ride: ride at your own pace',
      }));
      currentSecond += duration;
    } else if (tagName === 'maxeffort') {
      const duration = Math.round(parseNum('Duration', 60));
      intervals.push(createInterval({
        id: `maxeffort-${nodeIdx}`,
        type: 'MaxEffort',
        durationSeconds: duration,
        startSecond: currentSecond,
        powerLow: 1.5,
        powerHigh: 1.5,
        power: 1.5,
        ftp,
        text: 'MAX EFFORT: Full gas!',
      }));
      currentSecond += duration;
    }
  });

  const totalDurationSeconds = currentSecond;

  // Calculate workout statistics
  let totalWeightedWattsSeconds = 0;
  let totalWatts4Seconds = 0;

  intervals.forEach((inv) => {
    const avgWatts = (inv.targetWattsStart + inv.targetWattsEnd) / 2;
    totalWeightedWattsSeconds += avgWatts * inv.durationSeconds;
    totalWatts4Seconds += Math.pow(avgWatts, 4) * inv.durationSeconds;
  });

  const avgTargetWatts = totalDurationSeconds > 0 ? Math.round(totalWeightedWattsSeconds / totalDurationSeconds) : 0;
  const avgTargetPowerPercent = ftp > 0 ? Number((avgTargetWatts / ftp).toFixed(2)) : 0;
  const normalizedTargetWatts = totalDurationSeconds > 0 ? Math.round(Math.pow(totalWatts4Seconds / totalDurationSeconds, 0.25)) : 0;
  const intensityFactor = ftp > 0 ? Number((normalizedTargetWatts / ftp).toFixed(2)) : 0;
  const estimatedTss = ftp > 0 && totalDurationSeconds > 0
    ? Math.round((totalDurationSeconds * normalizedTargetWatts * intensityFactor) / (ftp * 36))
    : 0;

  return {
    title,
    author,
    description,
    sportType,
    intervals,
    totalDurationSeconds,
    avgTargetPowerPercent,
    avgTargetWatts,
    normalizedTargetWatts,
    estimatedTss,
    intensityFactor,
    rawXml: xmlContent,
  };
}

function createInterval(params: {
  id: string;
  type: WorkoutIntervalType;
  durationSeconds: number;
  startSecond: number;
  powerLow: number;
  powerHigh: number;
  power: number;
  ftp: number;
  cadence?: number;
  repeatIndex?: number;
  totalRepeats?: number;
  text?: string;
}): WorkoutInterval {
  const targetWattsStart = Math.round(params.powerLow * params.ftp);
  const targetWattsEnd = Math.round(params.powerHigh * params.ftp);
  const avgPower = (params.powerLow + params.powerHigh) / 2;
  const colorZone = getPowerZoneNumber(avgPower * params.ftp, params.ftp);

  return {
    id: params.id,
    type: params.type,
    durationSeconds: params.durationSeconds,
    startSecond: params.startSecond,
    endSecond: params.startSecond + params.durationSeconds,
    powerLow: params.powerLow,
    powerHigh: params.powerHigh,
    power: params.power,
    targetWattsStart,
    targetWattsEnd,
    cadence: params.cadence,
    repeatIndex: params.repeatIndex,
    totalRepeats: params.totalRepeats,
    text: params.text,
    colorZone,
  };
}

/**
 * Re-scales an already parsed workout to a new FTP value
 */
export function recalculateWorkoutFtp(workout: ParsedWorkout, newFtp: number): ParsedWorkout {
  if (!workout.rawXml) return workout;
  return parseZwoWorkout(workout.rawXml, newFtp);
}

/**
 * Built-in workouts for instant selection
 */
export const SAMPLE_WORKOUTS: { name: string; description: string; xml: string }[] = [
  {
    name: 'Sweet Spot Progression (2x10 min)',
    description: 'Classic sweet spot training to raise your threshold power without excessive fatigue. Includes warm-up and cool-down.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>VeloTrain Coach</author>
  <name>Sweet Spot Progression (2x10 min)</name>
  <description>2x10min sweet spot intervals at 88-92% FTP with 4min recovery.</description>
  <sportType>bike</sportType>
  <workout>
    <Warmup Duration="480" PowerLow="0.45" PowerHigh="0.75" Cadence="85"/>
    <SteadyState Duration="120" Power="0.65" Cadence="90"/>
    <SteadyState Duration="600" Power="0.90" Cadence="92"/>
    <SteadyState Duration="240" Power="0.55" Cadence="85"/>
    <SteadyState Duration="600" Power="0.90" Cadence="90"/>
    <Cooldown Duration="360" PowerLow="0.65" PowerHigh="0.40" Cadence="85"/>
  </workout>
</workout_file>`,
  },
  {
    name: 'VO2 Max Boost (5x3 min)',
    description: 'High aerobic power intervals designed to increase maximum oxygen uptake and punchy climbing power.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>VeloTrain Coach</author>
  <name>VO2 Max Boost (5x3 min)</name>
  <description>5 repeats of 3 minutes at 115% FTP with 3 minutes easy recovery.</description>
  <sportType>bike</sportType>
  <workout>
    <Warmup Duration="600" PowerLow="0.50" PowerHigh="0.80" Cadence="90"/>
    <SteadyState Duration="180" Power="0.60" Cadence="85"/>
    <IntervalsT Repeat="5" OnDuration="180" OffDuration="180" OnPower="1.15" OffPower="0.50" Cadence="98" CadenceRest="80"/>
    <Cooldown Duration="300" PowerLow="0.60" PowerHigh="0.40" Cadence="85"/>
  </workout>
</workout_file>`,
  },
  {
    name: 'Over-Under Threshold (3x9 min)',
    description: 'Alternate between just below and just above threshold (95% and 105% FTP) to train lactate clearance.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>VeloTrain Coach</author>
  <name>Over-Under Threshold (3x9 min)</name>
  <description>3 sets of 9 minutes alternating 2min Under / 1min Over.</description>
  <sportType>bike</sportType>
  <workout>
    <Warmup Duration="480" PowerLow="0.50" PowerHigh="0.80" Cadence="90"/>
    <IntervalsT Repeat="3" OnDuration="120" OffDuration="60" OnPower="0.95" OffPower="1.05" Cadence="90" CadenceRest="95"/>
    <SteadyState Duration="240" Power="0.50" Cadence="85"/>
    <IntervalsT Repeat="3" OnDuration="120" OffDuration="60" OnPower="0.95" OffPower="1.05" Cadence="90" CadenceRest="95"/>
    <SteadyState Duration="240" Power="0.50" Cadence="85"/>
    <IntervalsT Repeat="3" OnDuration="120" OffDuration="60" OnPower="0.95" OffPower="1.05" Cadence="90" CadenceRest="95"/>
    <Cooldown Duration="300" PowerLow="0.65" PowerHigh="0.45" Cadence="85"/>
  </workout>
</workout_file>`,
  },
  {
    name: 'FTP Ramp Test Protocol',
    description: 'Progressive ramp test starting at 100W and stepping up by 20W every minute until exhaustion.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>VeloTrain Coach</author>
  <name>FTP Ramp Test Protocol</name>
  <description>Standard 1-minute step test to evaluate FTP.</description>
  <sportType>bike</sportType>
  <workout>
    <Warmup Duration="300" PowerLow="0.40" PowerHigh="0.50" Cadence="85"/>
    <SteadyState Duration="60" Power="0.52" Cadence="90"/>
    <SteadyState Duration="60" Power="0.60" Cadence="90"/>
    <SteadyState Duration="60" Power="0.68" Cadence="90"/>
    <SteadyState Duration="60" Power="0.76" Cadence="90"/>
    <SteadyState Duration="60" Power="0.84" Cadence="90"/>
    <SteadyState Duration="60" Power="0.92" Cadence="90"/>
    <SteadyState Duration="60" Power="1.00" Cadence="90"/>
    <SteadyState Duration="60" Power="1.08" Cadence="90"/>
    <SteadyState Duration="60" Power="1.16" Cadence="90"/>
    <SteadyState Duration="60" Power="1.24" Cadence="90"/>
    <SteadyState Duration="60" Power="1.32" Cadence="90"/>
    <SteadyState Duration="60" Power="1.40" Cadence="90"/>
    <SteadyState Duration="60" Power="1.48" Cadence="90"/>
    <Cooldown Duration="300" PowerLow="0.50" PowerHigh="0.35" Cadence="80"/>
  </workout>
</workout_file>`,
  },
  {
    name: 'Active Recovery Spin (30 min)',
    description: 'Easy recovery ride at low intensity to promote blood flow, clear fatigue, and spin the legs.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>VeloTrain Coach</author>
  <name>Active Recovery Spin (30 min)</name>
  <description>30 minutes easy spinning at 50-55% FTP.</description>
  <sportType>bike</sportType>
  <workout>
    <Warmup Duration="300" PowerLow="0.35" PowerHigh="0.50" Cadence="85"/>
    <SteadyState Duration="1200" Power="0.52" Cadence="90"/>
    <Cooldown Duration="300" PowerLow="0.50" PowerHigh="0.35" Cadence="80"/>
  </workout>
</workout_file>`,
  },
];
