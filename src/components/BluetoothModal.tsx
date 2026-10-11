import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { X, Bluetooth, Zap, Activity, Heart, RefreshCw, CheckCircle2, AlertTriangle, PlayCircle } from 'lucide-react';
import { BluetoothDevicesState } from '../types';

interface BluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  devicesState: BluetoothDevicesState;
  onConnectTrainer: () => Promise<void>;
  onDisconnectTrainer: () => void;
  onConnectCadence: () => Promise<void>;
  onDisconnectCadence: () => void;
  onConnectHeartRate: () => Promise<void>;
  onDisconnectHeartRate: () => void;
  onToggleSimulation: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  isOpen,
  onClose,
  devicesState,
  onConnectTrainer,
  onDisconnectTrainer,
  onConnectCadence,
  onDisconnectCadence,
  onConnectHeartRate,
  onDisconnectHeartRate,
  onToggleSimulation,
}) => {
  const [loadingDevice, setLoadingDevice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isBluetoothSupported =
    (typeof navigator !== 'undefined' && 'bluetooth' in navigator) || Capacitor.isNativePlatform();

  const handleConnect = async (type: 'trainer' | 'cadence' | 'heartRate') => {
    setLoadingDevice(type);
    setErrorMessage(null);
    try {
      if (type === 'trainer') await onConnectTrainer();
      if (type === 'cadence') await onConnectCadence();
      if (type === 'heartRate') await onConnectHeartRate();
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setErrorMessage(err.message || 'Bluetooth connection failed');
      }
    } finally {
      setLoadingDevice(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bluetooth className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Bluetooth Sensors</h2>
              <p className="text-xs text-slate-400">
                Pair your Smart Trainer (FTMS), Cadence, and Heart Rate monitor
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

        {/* Compatibility warning if not supported */}
        {!isBluetoothSupported && (
          <div className="my-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Web Bluetooth not supported in this browser.</strong>
              <p className="mt-0.5 text-amber-200/80">
                Please open this webapp in Google Chrome, Microsoft Edge, Brave, or Chromium. You can also use the built-in <strong>Simulation Mode</strong> below for instant testing!
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Device Cards */}
        <div className="space-y-3.5 my-4 overflow-y-auto pr-1">
          {/* 1. Smart Trainer */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Smart Trainer</span>
                  {devicesState.trainer.connected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {devicesState.trainer.name || 'FTMS / Cycling Power (Power + ERG Mode)'}
                </p>
              </div>
            </div>

            <div>
              {devicesState.trainer.connected ? (
                <button
                  onClick={onDisconnectTrainer}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-slate-800 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect('trainer')}
                  disabled={loadingDevice === 'trainer' || !isBluetoothSupported}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {loadingDevice === 'trainer' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* 2. Cadence Sensor */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Cadence Sensor</span>
                  {devicesState.cadence.connected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {devicesState.cadence.name || 'Bluetooth CSC Crank Sensor'}
                </p>
              </div>
            </div>

            <div>
              {devicesState.cadence.connected ? (
                <button
                  onClick={onDisconnectCadence}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-slate-800 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect('cadence')}
                  disabled={loadingDevice === 'cadence' || !isBluetoothSupported}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {loadingDevice === 'cadence' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* 3. Heart Rate Sensor */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Heart Rate Sensor</span>
                  {devicesState.heartRate.connected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {devicesState.heartRate.name || 'Bluetooth Chest Strap / Armband'}
                </p>
              </div>
            </div>

            <div>
              {devicesState.heartRate.connected ? (
                <button
                  onClick={onDisconnectHeartRate}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-slate-800 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect('heartRate')}
                  disabled={loadingDevice === 'heartRate' || !isBluetoothSupported}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {loadingDevice === 'heartRate' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Demo Simulator Toggle */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">
                Demo & Simulation Mode
              </span>
              {devicesState.isSimulated && (
                <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates realistic trainer power, cadence, and heart rate for testing
            </p>
          </div>

          <button
            onClick={onToggleSimulation}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              devicesState.isSimulated
                ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50 hover:bg-rose-800/80'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            {devicesState.isSimulated ? 'Stop Simulator' : 'Start Simulator'}
          </button>
        </div>
      </div>
    </div>
  );
};
