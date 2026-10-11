import React, { useMemo } from 'react';
import { ParsedWorkout, WorkoutInterval } from '../types';
import { POWER_ZONES_CONFIG } from '../utils/zones';

interface WorkoutProfileChartProps {
  workout: ParsedWorkout | null;
  currentSecond: number;
  currentIntervalIndex: number;
  ftp: number;
  onSelectInterval?: (index: number) => void;
}

export const WorkoutProfileChart: React.FC<WorkoutProfileChartProps> = ({
  workout,
  currentSecond,
  currentIntervalIndex,
  ftp,
  onSelectInterval,
}) => {
  if (!workout || workout.intervals.length === 0) {
    return (
      <div className="w-full h-32 md:h-44 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-slate-400 font-medium">
          No structured workout loaded. Free Ride / Manual ERG mode active.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Upload a <span className="text-cyan-400 font-mono">.zwo</span> workout file or select a preset to view interval profile and auto-control trainer resistance.
        </p>
      </div>
    );
  }

  const totalDuration = Math.max(1, workout.totalDurationSeconds);

  // Determine max power scale (at least 120% FTP, or higher if high intervals exist)
  const maxPowerPercent = useMemo(() => {
    let max = 1.25;
    workout.intervals.forEach((inv) => {
      max = Math.max(max, inv.powerHigh, inv.powerLow, inv.power);
    });
    return max * 1.1; // Add 10% headroom
  }, [workout]);

  // Compute SVG polygons/rectangles for each interval
  const chartHeight = 140; // SVG coordinate units
  const chartWidth = 1000;

  const getX = (sec: number) => (sec / totalDuration) * chartWidth;
  const getY = (powerRatio: number) => {
    const fraction = Math.min(1, Math.max(0, powerRatio / maxPowerPercent));
    return chartHeight - fraction * (chartHeight - 16);
  };

  const getZoneColor = (powerRatio: number): string => {
    const ratio = powerRatio;
    if (ratio <= 0.55) return POWER_ZONES_CONFIG[0].color;
    if (ratio <= 0.75) return POWER_ZONES_CONFIG[1].color;
    if (ratio <= 0.90) return POWER_ZONES_CONFIG[2].color;
    if (ratio <= 1.05) return POWER_ZONES_CONFIG[3].color;
    if (ratio <= 1.20) return POWER_ZONES_CONFIG[4].color;
    if (ratio <= 1.50) return POWER_ZONES_CONFIG[5].color;
    return POWER_ZONES_CONFIG[6].color;
  };

  const scrubberX = getX(Math.min(currentSecond, totalDuration));

  return (
    <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl backdrop-blur-md">
      {/* Workout Header Info */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-200 truncate max-w-xs md:max-w-md">
            {workout.title}
          </span>
          <span className="text-slate-400">
            • {Math.floor(workout.totalDurationSeconds / 60)} min
          </span>
          <span className="text-cyan-400 font-semibold">
            • TSS {workout.estimatedTss}
          </span>
          <span className="text-amber-400 font-semibold">
            • IF {workout.intensityFactor}
          </span>
        </div>

        {/* FTP threshold line indicator */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <div className="w-3 h-0.5 bg-yellow-400/80 dashed" />
          <span>FTP ({ftp}W)</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-32 md:h-40 overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800/80">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full preserve-3d"
          preserveAspectRatio="none"
        >
          {/* Subtle grid lines */}
          <line
            x1="0"
            y1={getY(1.0)}
            x2={chartWidth}
            y2={getY(1.0)}
            stroke="#facc15"
            strokeDasharray="4 4"
            strokeWidth="1.2"
            opacity="0.4"
          />
          <line
            x1="0"
            y1={getY(0.75)}
            x2={chartWidth}
            y2={getY(0.75)}
            stroke="#38bdf8"
            strokeDasharray="2 4"
            strokeWidth="0.8"
            opacity="0.25"
          />

          {/* Intervals polygons */}
          {workout.intervals.map((inv, idx) => {
            const x1 = getX(inv.startSecond);
            const x2 = getX(inv.endSecond);
            const y1 = getY(inv.powerLow);
            const y2 = getY(inv.powerHigh);
            const yBase = chartHeight;

            const avgPowerRatio = (inv.powerLow + inv.powerHigh) / 2;
            const color = getZoneColor(avgPowerRatio);
            const isActive = idx === currentIntervalIndex;

            // Trapezoid or rectangle points: (x1, yBase) -> (x1, y1) -> (x2, y2) -> (x2, yBase)
            const points = `${x1},${yBase} ${x1},${y1} ${x2},${y2} ${x2},${yBase}`;

            return (
              <g
                key={inv.id}
                onClick={() => onSelectInterval?.(idx)}
                className="cursor-pointer transition-opacity duration-200"
              >
                {/* Interval Fill */}
                <polygon
                  points={points}
                  fill={color}
                  fillOpacity={isActive ? 0.85 : 0.45}
                  stroke={isActive ? '#ffffff' : color}
                  strokeWidth={isActive ? 2 : 0.8}
                />

                {/* If active, glow highlight */}
                {isActive && (
                  <polygon
                    points={points}
                    fill={color}
                    fillOpacity={0.2}
                    filter="drop-shadow(0px 0px 8px rgba(255,255,255,0.5))"
                  />
                )}
              </g>
            );
          })}

          {/* Elapsed Progress Shade (Darkens past portion slightly) */}
          <rect
            x="0"
            y="0"
            width={scrubberX}
            height={chartHeight}
            fill="#ffffff"
            fillOpacity="0.08"
          />

          {/* Scrubber / Current Position Line */}
          <line
            x1={scrubberX}
            y1="0"
            x2={scrubberX}
            y2={chartHeight}
            stroke="#ffffff"
            strokeWidth="2.5"
          />
          <circle
            cx={scrubberX}
            cy="6"
            r="4.5"
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Timeline labels */}
      <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400 font-mono">
        <span>00:00</span>
        <span>
          {Math.floor(workout.totalDurationSeconds / 120)}:00
        </span>
        <span>
          {Math.floor(workout.totalDurationSeconds / 60)}:
          {String(workout.totalDurationSeconds % 60).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};
