import React from 'react';
import { Bluetooth, Zap, Activity, Heart, Settings, Dumbbell, ShieldCheck } from 'lucide-react';
import { BluetoothDevicesState, ParsedWorkout } from '../types';

interface HeaderProps {
  devicesState: BluetoothDevicesState;
  currentWorkout: ParsedWorkout | null;
  onOpenBluetooth: () => void;
  onOpenWorkout: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  devicesState,
  currentWorkout,
  onOpenBluetooth,
  onOpenWorkout,
  onOpenSettings,
}) => {
  const connectedCount = [
    devicesState.trainer.connected,
    devicesState.cadence.connected,
    devicesState.heartRate.connected,
  ].filter(Boolean).length;

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20">
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="18.5" cy="17.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="5.5" cy="17.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="15" cy="5" r="1.5" />
              <path d="M12 17.5V14l-3-3 4-3 2 3h2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base md:text-lg font-black tracking-tight text-white">
                Velo<span className="text-cyan-400">Train</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                STUDIO
              </span>
            </div>
          </div>
        </div>

        {/* Center: Device Status Pills */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Trainer Pill */}
          <button
            onClick={onOpenBluetooth}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              devicesState.trainer.connected
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${devicesState.trainer.connected ? 'fill-current' : ''}`} />
            <span>Trainer</span>
            {devicesState.trainer.connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          {/* Cadence Pill */}
          <button
            onClick={onOpenBluetooth}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              devicesState.cadence.connected
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Cadence</span>
            {devicesState.cadence.connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          {/* HR Pill */}
          <button
            onClick={onOpenBluetooth}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              devicesState.heartRate.connected
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${devicesState.heartRate.connected ? 'fill-current' : ''}`} />
            <span>Heart Rate</span>
            {devicesState.heartRate.connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile bluetooth button */}
          <button
            onClick={onOpenBluetooth}
            className="sm:hidden flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400"
          >
            <Bluetooth className="w-4 h-4" />
            <span className="text-xs font-bold">{connectedCount}</span>
          </button>

          {/* Desktop Bluetooth Modal Trigger */}
          <button
            onClick={onOpenBluetooth}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition-colors"
          >
            <Bluetooth className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sensors ({connectedCount}/3)</span>
          </button>

          {/* Workout Selector Button */}
          <button
            onClick={onOpenWorkout}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              currentWorkout
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[120px] md:max-w-[160px] truncate">
              {currentWorkout ? currentWorkout.title : 'Workout (.zwo)'}
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

