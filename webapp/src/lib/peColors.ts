import type { ColorSet, LogEvent } from '../types';

// Fixed categorical palette — colors are assigned to PE values by a deterministic
// hash of the PE value itself (never by first-appearance or selection order), so
// a given PE always renders the same color across every file/session.
export const PALETTE: ColorSet[] = [
  { dot: '#378add', bg: '#1c2733', text: '#85b7eb' },
  { dot: '#ba7517', bg: '#332a19', text: '#f0a93d' },
  { dot: '#1d9e75', bg: '#173028', text: '#5dcaa5' },
  { dot: '#d4537e', bg: '#331c26', text: '#ed93b1' },
  { dot: '#7f77dd', bg: '#232043', text: '#afa9ec' },
  { dot: '#e24b4a', bg: '#331d1d', text: '#f09595' },
  { dot: '#2fa8a3', bg: '#152e2d', text: '#7fd8d3' },
  { dot: '#c9a227', bg: '#302a13', text: '#e8c95f' },
];

export const OTHER_COLOR: ColorSet = { dot: '#8a8a86', bg: '#28282a', text: '#b5b5b0' };

function peColorIndex(eventType: LogEvent['eventType']): number {
  let hash = 0;
  for (const ch of String(eventType)) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % PALETTE.length;
}

export function buildPeColorMap(events: LogEvent[]): Map<LogEvent['eventType'], ColorSet> {
  const map = new Map<LogEvent['eventType'], ColorSet>();
  for (const e of events) {
    if (!map.has(e.eventType)) {
      map.set(e.eventType, PALETTE[peColorIndex(e.eventType)]);
    }
  }
  return map;
}

export function rareThreshold(total: number): number {
  return Math.max(1, Math.round(total * 0.05));
}

export function isRare(count: number, total: number): boolean {
  return count <= rareThreshold(total);
}

export function countByPe(events: LogEvent[]): Map<LogEvent['eventType'], number> {
  const counts = new Map<LogEvent['eventType'], number>();
  for (const e of events) counts.set(e.eventType, (counts.get(e.eventType) ?? 0) + 1);
  return counts;
}
