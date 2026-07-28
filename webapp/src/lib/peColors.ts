import type { ColorSet, KeywordHighlight, LogEvent } from '../types';

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

// Renders a palette dot color as a translucent overlay instead of a fixed hex bg,
// so it tints whatever --card-bg is underneath (dark or light theme) rather than
// painting a theme-fixed block that goes murky in dark mode or overpowering in light mode.
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) dist[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  return dist[rows - 1][cols - 1];
}

// How many mistyped/extra/missing characters we tolerate, scaled to keyword length
// so a 3-letter keyword still has to be close but "tiemout" still finds "timeout".
function fuzzyThreshold(len: number): number {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

// First active keyword highlight (in chip order) that matches the event's
// description/details/record — same haystack as the table's search box, but
// tolerant of typos: falls back to a per-word edit-distance check when the
// keyword isn't found as an exact substring.
export function matchKeywordHighlight(event: LogEvent, highlights: KeywordHighlight[]): KeywordHighlight | null {
  if (!highlights.length) return null;
  const haystack = `${event.description} ${event.details} ${event.record}`.toLowerCase();
  const words = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  for (const h of highlights) {
    if (!h.active) continue;
    const kw = h.keyword.toLowerCase().trim();
    if (!kw) continue;
    if (haystack.includes(kw)) return h;
    const threshold = fuzzyThreshold(kw.length);
    if (words.some((w) => Math.abs(w.length - kw.length) <= threshold && levenshtein(w, kw) <= threshold)) return h;
  }
  return null;
}

// Candidate keywords for the highlight input's autocomplete dropdown: each event's
// whole description (a short category label, e.g. "Wireless Disconnection") plus
// individual words (4+ chars) pulled from details/record, ranked by how often they
// occur so the most useful/common terms surface first.
export function buildKeywordSuggestions(events: LogEvent[]): string[] {
  const freq = new Map<string, number>();
  const bump = (raw: string) => {
    const value = raw.trim();
    if (value.length < 3) return;
    freq.set(value, (freq.get(value) ?? 0) + 1);
  };
  for (const e of events) {
    bump(e.description);
    for (const word of `${e.details} ${e.record}`.split(/[^a-zA-Z0-9]+/)) {
      if (word.length >= 4) bump(word);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word)
    .slice(0, 60);
}

// Right-clicking a Details/Raw cell should highlight the leading identifier
// ("NewChannelReq"), not the whole verbose string that follows it — those columns
// are usually "Label (extra info): more detail, more detail" and only the label
// is a meaningful, reusable highlight term. Cuts at the first '(' or ':' and falls
// back to the full trimmed value when there's no such delimiter to cut at.
export function extractHighlightLabel(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^[^:(]+/);
  const label = match ? match[0].trim() : '';
  return label || trimmed;
}
