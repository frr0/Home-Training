import React, { useState } from 'react';
import { X, Settings, User, Gauge, Volume2, Save } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<UserSettings>({ ...settings });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Rider & Physics Settings</h2>
              <p className="text-xs text-slate-400">
                Configure FTP, physiological zones, and virtual velocity calculation
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 my-4 pr-1">
          {/* FTP */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Functional Threshold Power (FTP)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="50"
                max="600"
                value={formData.ftp}
                onChange={(e) => setFormData({ ...formData, ftp: Math.max(50, parseInt(e.target.value) || 200) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-lg font-bold focus:outline-none focus:border-cyan-400"
              />
              <span className="text-slate-400 font-bold text-sm">Watts</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Target wattages in .zwo workouts scale automatically based on your FTP.
            </p>
          </div>

          {/* Rider & Bike Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Rider Weight
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="30"
                  max="200"
                  value={formData.riderWeightKg}
                  onChange={(e) => setFormData({ ...formData, riderWeightKg: parseFloat(e.target.value) || 75 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                />
                <span className="text-slate-400 font-bold text-xs">kg</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Bike + Gear
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="35"
                  value={formData.bikeWeightKg}
                  onChange={(e) => setFormData({ ...formData, bikeWeightKg: parseFloat(e.target.value) || 9 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                />
                <span className="text-slate-400 font-bold text-xs">kg</span>
              </div>
            </div>
          </div>

          {/* Heart Rate Max */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Max Heart Rate
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="100"
                max="230"
                value={formData.maxHeartRate}
                onChange={(e) => setFormData({ ...formData, maxHeartRate: parseInt(e.target.value) || 190 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
              <span className="text-slate-400 font-bold text-xs">BPM</span>
            </div>
          </div>

          {/* Speed Source Selection */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Velocity / Speed Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, speedSource: 'physics' })}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  formData.speedSource === 'physics'
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Physics Model</div>
                <div className="text-[10px] opacity-75 mt-0.5">Calculated from Power & Aerodynamics</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, speedSource: 'trainer' })}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  formData.speedSource === 'trainer'
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Trainer Hardware</div>
                <div className="text-[10px] opacity-75 mt-0.5">Reported by Flywheel Sensor</div>
              </button>
            </div>
          </div>

          {/* Sound toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-slate-400" />
              <div>
                <span className="text-sm font-semibold text-white">Audio Countdown Cues</span>
                <p className="text-xs text-slate-500">Beeps at 3, 2, 1s interval transitions</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.soundAlerts}
              onChange={(e) => setFormData({ ...formData, soundAlerts: e.target.checked })}
              className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
