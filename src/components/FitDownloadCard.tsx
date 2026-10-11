import React, { useState } from 'react';
import { Download, CheckCircle2, Trophy, X, FileCheck, Share2, BarChart2 } from 'lucide-react';
import { SessionSummary } from '../types';

interface FitDownloadCardProps {
  summary: SessionSummary;
  fitBlobUrl: string;
  fitFilename: string;
  fitSizeBytes: number;
  base64Data: string;
  onOpenSummaryModal?: () => void;
  onDismiss: () => void;
}

export const FitDownloadCard: React.FC<FitDownloadCardProps> = ({
  summary,
  fitBlobUrl,
  fitFilename,
  fitSizeBytes,
  base64Data,
  onOpenSummaryModal,
  onDismiss,
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${hrs}h ${pad(mins)}m ${pad(secs)}s`;
    }
    return `${mins}m ${pad(secs)}s`;
  };

  const handleDownload = (e: React.MouseEvent) => {
    // Android native bridge (AndroidDownloader injected in MainActivity)
    if ((window as any).AndroidDownloader?.downloadBase64File) {
      e.preventDefault();
      (window as any).AndroidDownloader.downloadBase64File(fitFilename, base64Data);
      setDownloaded(true);
      return;
    }

    // Browser and Electron fallback
    setDownloaded(true);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900/95 border-2 border-emerald-500/50 p-5 md:p-6 shadow-2xl shadow-emerald-500/15 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Background neon glow highlight */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
                Sessione Completata • File .FIT Pronto
              </h3>
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <FileCheck className="w-3 h-3" />
                FIT DISPONIBILE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              File compatibile con Garmin Connect, Strava, TrainingPeaks e Intervals.icu.
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          title="Chiudi card"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tempo</div>
          <div className="text-lg font-black font-mono text-cyan-400 mt-0.5">
            {formatTime(summary.totalTimerTimeSeconds)}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distanza</div>
          <div className="text-lg font-black font-mono text-cyan-400 mt-0.5">
            {(summary.totalDistanceMeters / 1000).toFixed(2)} <span className="text-xs">km</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Potenza Media</div>
          <div className="text-lg font-black font-mono text-amber-400 mt-0.5">
            {summary.avgPowerWatts} <span className="text-xs">W</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Calorie</div>
          <div className="text-lg font-black font-mono text-orange-400 mt-0.5">
            {summary.totalCaloriesKcal} <span className="text-xs">kcal</span>
          </div>
        </div>
      </div>

      {/* Action Bar with Download Link & Button */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Direct HTML download link styled as high-contrast button */}
        <a
          href={fitBlobUrl}
          download={fitFilename}
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
        >
          <Download className="w-5 h-5 stroke-[2.5]" />
          <span>SCARICA FILE .FIT</span>
        </a>

        {onOpenSummaryModal && (
          <button
            onClick={onOpenSummaryModal}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 font-bold text-xs transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span>Grafici Completi</span>
          </button>
        )}
      </div>

      {/* Direct link line & status */}
      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>Link diretto:</span>
          <a
            href={fitBlobUrl}
            download={fitFilename}
            onClick={handleDownload}
            className="text-cyan-400 hover:text-cyan-300 font-mono font-bold underline underline-offset-2 flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            {fitFilename}
          </a>
          <span className="text-slate-500 font-mono">({(fitSizeBytes / 1024).toFixed(1)} KB)</span>
        </div>

        {downloaded && (
          <span className="text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            File avviato al download!
          </span>
        )}
      </div>
    </div>
  );
};
