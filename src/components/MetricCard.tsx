import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit: string;
  subValue?: string | React.ReactNode;
  icon?: React.ReactNode;
  accentColor?: string;
  gaugePercent?: number; // 0 to 100
  gaugeColor?: string;
  footer?: React.ReactNode;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subValue,
  icon,
  accentColor = '#38bdf8',
  gaugePercent,
  gaugeColor = '#38bdf8',
  footer,
  highlight = false,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-900/90 border p-5 backdrop-blur-md transition-all duration-200 flex flex-col justify-between ${
        highlight
          ? 'border-cyan-500/60 shadow-[0_0_25px_-5px_rgba(6,182,212,0.3)]'
          : 'border-slate-800 hover:border-slate-700 shadow-lg'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: accentColor }}>{icon}</span>}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {label}
          </span>
        </div>
        {subValue && (
          <div className="text-xs font-semibold text-slate-300">
            {subValue}
          </div>
        )}
      </div>

      {/* Main Big Readout */}
      <div className="flex items-baseline justify-center gap-2 my-2 py-1">
        <span
          className="text-5xl md:text-6xl font-black tracking-tight font-mono transition-colors duration-150"
          style={{ color: accentColor }}
        >
          {value}
        </span>
        <span className="text-sm md:text-base font-bold uppercase text-slate-400">
          {unit}
        </span>
      </div>

      {/* Optional Progress / Gauge Bar */}
      {gaugePercent !== undefined && (
        <div className="w-full bg-slate-800/80 rounded-full h-2 mb-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, gaugePercent))}%`,
              backgroundColor: gaugeColor,
            }}
          />
        </div>
      )}

      {/* Footer Info */}
      {footer && <div className="mt-1 pt-2 border-t border-slate-800/80">{footer}</div>}
    </div>
  );
};
