import type { ColorSet, LogEvent } from '../types';

// Fixed categorical palette — colors are assigned to PE values by a deterministic
// hash of the PE value itself (never by first-appearance or selection order), so
// a given PE always renders the same color across every file/session.
// Hues spaced ~40° apart around the wheel (skipping the 260-300° purple/violet
// band) so adjacent palette entries stay visually distinct on the timeline.
export const PALETTE: ColorSet[] = [
  { dot: '#d9569a', bg: '#33202c', text: '#ef9dc0' }, // magenta (320°)
  { dot: '#e2524f', bg: '#331e1d', text: '#f0989a' }, // red (0°)
  { dot: '#e0862e', bg: '#332419', text: '#eebb7d' }, // orange (40°)
  { dot: '#a3b52e', bg: '#2a2d17', text: '#d3dd8a' }, // chartreuse (80°)
  { dot: '#2fa860', bg: '#17301f', text: '#7fd8a3' }, // green (120°)
  { dot: '#1fa88a', bg: '#17302a', text: '#5dcab8' }, // teal (160°)
  { dot: '#378add', bg: '#1c2733', text: '#85b7eb' }, // blue (200°)
  { dot: '#5169d9', bg: '#1e2140', text: '#a3aef0' }, // indigo (240°)
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
