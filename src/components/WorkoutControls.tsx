import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, ArrowDown, ArrowUp } from 'lucide-react';
import { SessionStatus } from '../types';

interface WorkoutControlsProps {
  status: SessionStatus;
  ergBiasPercent: number;
  hasWorkout: boolean;
  targetPower: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkipInterval: (forward: boolean) => void;
  onAdjustErgBias: (delta: number) => void;
  onAdjustManualWatts: (delta: number) => void;
}

export const WorkoutControls: React.FC<WorkoutControlsProps> = ({
  status,
  ergBiasPercent,
  hasWorkout,
  targetPower,
  onStart,
  onPause,
  onResume,
  onStop,
  onSkipInterval,
  onAdjustErgBias,
  onAdjustManualWatts,
}) => {
  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
      {/* 1. Main Action Buttons */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-center">
        {status === 'idle' && (
          <button
            onClick={onStart}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START WORKOUT</span>
          </button>
        )}

        {status === 'running' && (
          <>
            <button
              onClick={onPause}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-lg shadow-lg shadow-amber-500/25 transition-all transform active:scale-95"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>PAUSE</span>
            </button>

            <button
              onClick={onStop}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 border border-rose-700/60 text-rose-300 font-bold text-base transition-all transform active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>STOP & SAVE</span>
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              onClick={onResume}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>RESUME</span>
            </button>

            <button
              onClick={onStop}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 border border-rose-700/60 text-rose-300 font-bold text-base transition-all transform active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>FINISH & FIT</span>
            </button>
          </>
        )}
      </div>

      {/* 2. Interval Navigation Controls (If structured workout loaded) */}
      {hasWorkout && (
        <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl p-1.5">
          <button
            onClick={() => onSkipInterval(false)}
            title="Previous Interval"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
            Interval
          </span>
          <button
            onClick={() => onSkipInterval(true)}
            title="Next Interval"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Intensity Controls (ERG Bias or Manual Watts) */}
      <div className="flex items-center gap-3">
        {hasWorkout ? (
          /* ERG Bias: 90% ... 100% ... 110% */
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-xl p-1.5">
            <button
              onClick={() => onAdjustErgBias(-5)}
              title="-5% ERG Bias"
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
            >
              -5%
            </button>
            <button
              onClick={() => onAdjustErgBias(-1)}
              title="-1% ERG Bias"
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
            >
              -1%
            </button>

            <div className="px-2 py-0.5 text-center">
              <div className="text-xs font-bold text-cyan-400 font-mono">
                {ergBiasPercent}%
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                ERG BIAS
              </div>
            </div>

            <button
              onClick={() => onAdjustErgBias(1)}
              title="+1% ERG Bias"
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
            >
              +1%
            </button>
            <button
              onClick={() => onAdjustErgBias(5)}
              title="+5% ERG Bias"
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
            >
              +5%
            </button>
          </div>
        ) : (
          /* Manual Power Adjuster: -10W, -5W, +5W, +10W */
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-xl p-1.5">
            <button
              onClick={() => onAdjustManualWatts(-10)}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-300"
            >
              -10W
            </button>
            <button
              onClick={() => onAdjustManualWatts(-5)}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-300"
            >
              -5W
            </button>

            <div className="px-2 py-0.5 text-center">
              <div className="text-xs font-bold text-amber-400 font-mono">
                {targetPower}W
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                TARGET
              </div>
            </div>

            <button
              onClick={() => onAdjustManualWatts(5)}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-300"
            >
              +5W
            </button>
            <button
              onClick={() => onAdjustManualWatts(10)}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-300"
            >
              +10W
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
