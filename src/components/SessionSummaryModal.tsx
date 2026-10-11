import React, { useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Download, CheckCircle2, Trophy, Flame, Zap, Heart, Activity, ArrowRight, X } from 'lucide-react';
import { SessionSummary } from '../types';
import { downloadFitFile } from '../services/fit/fitGenerator';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SessionSummary | null;
  workoutTitle?: string;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  workoutTitle,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#4ade80', '#facc15', '#fb923c', '#c084fc'],
        });
      } catch {
        // Confetti fallback
      }
    }
  }, [isOpen]);

  if (!isOpen || !summary) return null;

  const handleDownloadFit = () => {
    downloadFitFile(summary);
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  // Sparkline/SVG chart of power over time
  const powerPoints = useMemo(() => {
    if (!summary.samples || summary.samples.length < 2) return '';
    const samples = summary.samples;
    const maxPower = Math.max(100, summary.maxPowerWatts);
    const width = 600;
    const height = 90;

    return samples
      .map((s, idx) => {
        const x = (idx / (samples.length - 1)) * width;
        const y = height - (s.power / maxPower) * (height - 8);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [summary]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Banner */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Workout Finished!</h2>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  COMPLETED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {workoutTitle || 'Indoor Cycling Session'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Summary Stats */}
        <div className="overflow-y-auto space-y-4 my-4 pr-1">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Time */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-[11px] font-bold uppercase text-slate-400">Duration</div>
              <div className="text-xl font-black font-mono text-cyan-400 mt-1">
                {formatTime(summary.totalTimerTimeSeconds)}
              </div>
            </div>

            {/* 2. Distance */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-[11px] font-bold uppercase text-slate-400">Distance</div>
              <div className="text-xl font-black font-mono text-cyan-400 mt-1">
                {(summary.totalDistanceMeters / 1000).toFixed(2)} <span className="text-xs">km</span>
              </div>
            </div>

            {/* 3. Avg Power */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-[11px] font-bold uppercase text-slate-400">Avg Power</div>
              <div className="text-xl font-black font-mono text-amber-400 mt-1">
                {summary.avgPowerWatts} <span className="text-xs">W</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                NP: {summary.normalizedPowerWatts} W
              </div>
            </div>

            {/* 4. Calories */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-[11px] font-bold uppercase text-slate-400">Calories</div>
              <div className="text-xl font-black font-mono text-orange-400 mt-1">
                {summary.totalCaloriesKcal} <span className="text-xs">kcal</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Work: {summary.totalWorkKj} kJ
              </div>
            </div>
          </div>

          {/* Secondary Details Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Speed */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/70">
              <div className="text-[10px] uppercase font-bold text-slate-400">Speed (km/h)</div>
              <div className="text-sm font-bold text-slate-200 mt-1 font-mono">
                Avg: {summary.avgSpeedKmh.toFixed(1)} / Max: {summary.maxSpeedKmh.toFixed(1)}
              </div>
            </div>

            {/* Cadence */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/70">
              <div className="text-[10px] uppercase font-bold text-slate-400">Cadence (RPM)</div>
              <div className="text-sm font-bold text-slate-200 mt-1 font-mono">
                Avg: {summary.avgCadenceRpm} / Max: {summary.maxCadenceRpm}
              </div>
            </div>

            {/* Heart Rate */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/70">
              <div className="text-[10px] uppercase font-bold text-slate-400">Heart Rate (BPM)</div>
              <div className="text-sm font-bold text-slate-200 mt-1 font-mono">
                Avg: {summary.avgHeartRateBpm || '--'} / Max: {summary.maxHeartRateBpm || '--'}
              </div>
            </div>
          </div>

          {/* Training Load */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Training Stress & Intensity:</span>
            <div className="flex items-center gap-4 font-bold font-mono">
              <span className="text-cyan-400">TSS: {summary.trainingStressScore}</span>
              <span className="text-amber-400">IF: {summary.intensityFactor}</span>
            </div>
          </div>

          {/* Power Curve Sparkline */}
          {powerPoints && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-2">
                <span>Power Trace (Watts)</span>
                <span className="font-mono text-slate-500">Max: {summary.maxPowerWatts}W</span>
              </div>
              <div className="w-full h-24 overflow-hidden rounded-lg bg-slate-900/60 p-1">
                <svg viewBox="0 0 600 90" className="w-full h-full" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={powerPoints}
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleDownloadFit}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 transform active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            DOWNLOAD .FIT FILE
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-colors"
          >
            Done
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-500 mt-2">
          Your .FIT file includes all power, speed, cadence, and HR telemetry and can be uploaded directly to Strava, Garmin Connect, and Intervals.icu.
        </p>
      </div>
    </div>
  );
};

