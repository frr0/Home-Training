import { PowerZone, PowerZoneNumber, HeartRateZone } from '../types';

export const POWER_ZONES_CONFIG: {
  zone: PowerZoneNumber;
  name: string;
  minPercent: number;
  maxPercent: number;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    zone: 1,
    name: 'Active Recovery',
    minPercent: 0,
    maxPercent: 0.55,
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: '#94a3b8',
  },
  {
    zone: 2,
    name: 'Endurance',
    minPercent: 0.56,
    maxPercent: 0.75,
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.18)',
    borderColor: '#38bdf8',
  },
  {
    zone: 3,
    name: 'Tempo',
    minPercent: 0.76,
    maxPercent: 0.90,
    color: '#4ade80',
    bgColor: 'rgba(74, 222, 128, 0.18)',
    borderColor: '#4ade80',
  },
  {
    zone: 4,
    name: 'Threshold',
    minPercent: 0.91,
    maxPercent: 1.05,
    color: '#facc15',
    bgColor: 'rgba(250, 204, 21, 0.18)',
    borderColor: '#facc15',
  },
  {
    zone: 5,
    name: 'VO2 Max',
    minPercent: 1.06,
    maxPercent: 1.20,
    color: '#fb923c',
    bgColor: 'rgba(251, 146, 60, 0.20)',
    borderColor: '#fb923c',
  },
  {
    zone: 6,
    name: 'Anaerobic',
    minPercent: 1.21,
    maxPercent: 1.50,
    color: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.22)',
    borderColor: '#f87171',
  },
  {
    zone: 7,
    name: 'Neuromuscular',
    minPercent: 1.51,
    maxPercent: 3.0,
    color: '#c084fc',
    bgColor: 'rgba(192, 132, 252, 0.25)',
    borderColor: '#c084fc',
  },
];

export function getPowerZones(ftp: number): PowerZone[] {
  return POWER_ZONES_CONFIG.map((cfg) => ({
    ...cfg,
    minWatts: Math.round(cfg.minPercent * ftp),
    maxWatts: Math.round(cfg.maxPercent * ftp),
  }));
}

export function getPowerZoneNumber(power: number, ftp: number): PowerZoneNumber {
  if (power <= 0 || ftp <= 0) return 1;
  const ratio = power / ftp;
  if (ratio <= 0.55) return 1;
  if (ratio <= 0.75) return 2;
  if (ratio <= 0.90) return 3;
  if (ratio <= 1.05) return 4;
  if (ratio <= 1.20) return 5;
  if (ratio <= 1.50) return 6;
  return 7;
}

export function getPowerZoneInfo(power: number, ftp: number): PowerZone {
  const zNum = getPowerZoneNumber(power, ftp);
  const zones = getPowerZones(ftp);
  return zones.find((z) => z.zone === zNum) || zones[0];
}

export const HR_ZONES_CONFIG = [
  { zone: 1 as const, name: 'Recovery', minPercent: 0.50, maxPercent: 0.60, color: '#94a3b8' },
  { zone: 2 as const, name: 'Aerobic Base', minPercent: 0.60, maxPercent: 0.70, color: '#38bdf8' },
  { zone: 3 as const, name: 'Tempo', minPercent: 0.70, maxPercent: 0.80, color: '#4ade80' },
  { zone: 4 as const, name: 'Threshold', minPercent: 0.80, maxPercent: 0.90, color: '#facc15' },
  { zone: 5 as const, name: 'Anaerobic / Max', minPercent: 0.90, maxPercent: 1.00, color: '#ef4444' },
];

export function getHeartRateZoneNumber(hr: number, maxHr: number): number {
  if (hr <= 0 || maxHr <= 0) return 1;
  const ratio = hr / maxHr;
  if (ratio < 0.60) return 1;
  if (ratio < 0.70) return 2;
  if (ratio < 0.80) return 3;
  if (ratio < 0.90) return 4;
  return 5;
}

export function getHeartRateZoneInfo(hr: number, maxHr: number): HeartRateZone {
  const zNum = getHeartRateZoneNumber(hr, maxHr);
  const cfg = HR_ZONES_CONFIG.find((c) => c.zone === zNum) || HR_ZONES_CONFIG[0];
  return {
    ...cfg,
    minBpm: Math.round(cfg.minPercent * maxHr),
    maxBpm: Math.round(cfg.maxPercent * maxHr),
  };
}
