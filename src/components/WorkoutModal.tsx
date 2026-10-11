import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, Dumbbell, Zap, Clock } from 'lucide-react';
import { ParsedWorkout } from '../types';
import { parseZwoWorkout, SAMPLE_WORKOUTS } from '../services/workout/zwoParser';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkout: ParsedWorkout | null;
  ftp: number;
  onSelectWorkout: (workout: ParsedWorkout | null) => void;
}

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
  isOpen,
  onClose,
  currentWorkout,
  ftp,
  onSelectWorkout,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.zwo') && !file.name.endsWith('.xml')) {
      setError('Please upload a .zwo or .xml workout file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseZwoWorkout(content, ftp);
        onSelectWorkout(parsed);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to parse .zwo workout file');
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_WORKOUTS[0]) => {
    setError(null);
    try {
      const parsed = parseZwoWorkout(sample.xml, ftp);
      onSelectWorkout(parsed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to load sample workout');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Select / Upload Workout</h2>
              <p className="text-xs text-slate-400">
                Upload a Zwift .zwo workout file or choose a curated training protocol
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

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto space-y-5 my-4 pr-1">
          {/* File Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              dragActive
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
            }`}
          >
            <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">
              Drag & drop your <span className="text-cyan-400 font-mono">.zwo</span> file here
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports all standard Zwift workout files (.zwo / XML format)
            </p>

            <label className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer border border-slate-700 transition-colors">
              Browse File
              <input
                type="file"
                accept=".zwo,.xml"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          {/* Current Workout Banner (if any) */}
          {currentWorkout && (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-sm font-bold text-white">
                    Active: {currentWorkout.title}
                  </div>
                  <div className="text-xs text-cyan-300/80 mt-0.5">
                    {Math.floor(currentWorkout.totalDurationSeconds / 60)} min • TSS {currentWorkout.estimatedTss} • IF {currentWorkout.intensityFactor}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectWorkout(null);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Clear Workout (Free Ride)
              </button>
            </div>
          )}

          {/* Sample Workouts List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Preset Training Protocols
            </h3>
            <div className="space-y-2.5">
              {SAMPLE_WORKOUTS.map((sample, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSample(sample)}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-800/50 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-800 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-400 transition-colors">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {sample.name}
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {sample.description}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                    Load →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
