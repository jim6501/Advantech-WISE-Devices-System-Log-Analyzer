import type { ColorSet, LogEvent } from '../types';

// Fixed categorical palette — colors are assigned to PE values by first-appearance
// order (never by selection order or PE numeric value), so the legend stays stable
// regardless of what the user clicks. Beyond 8 distinct PEs, later ones fall back to
// a neutral "other" gray rather than growing the palette indefinitely.
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

export function buildPeColorMap(events: LogEvent[]): Map<LogEvent['eventType'], ColorSet> {
  const map = new Map<LogEvent['eventType'], ColorSet>();
  let paletteIndex = 0;
  for (const e of events) {
    if (!map.has(e.eventType)) {
      map.set(e.eventType, paletteIndex < PALETTE.length ? PALETTE[paletteIndex] : OTHER_COLOR);
      paletteIndex++;
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
