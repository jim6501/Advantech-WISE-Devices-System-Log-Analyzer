import type { LogEvent } from '../types';

// Ported from prototype.html's renderTimeline layout logic (pickBandSize / bucketing /
// dot offsetting), decoupled from DOM so it can be unit-driven and reused by the
// DensityTimeline component and its tests.

const BAND_TARGETS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  3 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
];

// Dynamically picks a band size targeting ~6-10 bands across the total span.
export function pickBandSize(spanMs: number): number {
  for (const target of BAND_TARGETS_MS) {
    if (spanMs / target <= 10) return target;
  }
  return BAND_TARGETS_MS[BAND_TARGETS_MS.length - 1];
}

export function formatBandLabel(ms: number, bandMs: number): string {
  const d = new Date(ms);
  if (bandMs >= 24 * 60 * 60 * 1000) return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export interface TimelineDot {
  x: number;
  y: number;
  r: number;
  // True when this dot's bucket-mates are packed close enough to overlap heavily.
  // Each dot is normally drawn with a background-colored stroke to separate it from
  // its neighbors, but with dozens of overlapping circles those strokes themselves
  // overlap and merge into a solid pale blob that hides the dots entirely — so the
  // renderer skips the stroke for these and lets the fills blend instead.
  dense: boolean;
  // True when this event's timestamp is significantly earlier than the running max
  // seen so far in recording order — a strong signal that the device RTC was reset
  // (e.g. after a power-cycle with no battery backup). The timeline still plots the
  // dot at the timestamp the device reported, but the renderer should visually flag it.
  clockReset: boolean;
  event: LogEvent;
}

/** A position on the timeline where a clock-reset cluster was detected. */
export interface ClockResetMarker {
  /** x-pixel coordinate of the reset cluster on the canvas. */
  x: number;
}

export interface TimelineLayout {
  tMin: number;
  tMax: number;
  span: number;
  bandMs: number;
  dots: TimelineDot[];
  xForT: (ms: number) => number;
  /** Distinct x-positions of detected RTC-reset clusters for warning annotation. */
  clockResetMarkers: ClockResetMarker[];
}

const WIDTH = 900;
const PAD_X = 12;
const LANE_Y = 70;
const BUCKET_COUNT = 60;
const BASE_RADIUS = 4;
const RADIUS_STEP = 1.5;
const MAX_RADIUS_BONUS = 4;
const MAX_BUCKET_SPREAD = 60;

// width defaults to the WIDTH constant so existing callers/tests are unaffected;
// DensityTimeline passes the container's real measured pixel width instead, so the
// viewBox always matches the rendered size 1:1 and no CSS scaling is ever applied
// (which previously distorted dots into ellipses and offset drag math).
export function buildTimelineLayout(events: LogEvent[], width: number = WIDTH): TimelineLayout | null {
  const withTime = events.filter((e) => e.timestampMs !== null) as (LogEvent & { timestampMs: number })[];
  if (!withTime.length) return null;

  // Compute tMin/tMax by scanning all timestamps rather than assuming the array is
  // sorted. Some files have a few out-of-order records at the tail (e.g. a device
  // reboot that reset the RTC), which makes withTime[last].timestampMs < withTime[0]
  // and collapses span to 1 000 ms — mapping every event to the same x-coordinate.
  // We intentionally do NOT sort the array: preserving original recording order means
  // out-of-order entries stay in their true sequence position; the timeline will show
  // them at whatever timestamp the device reported, which is the honest representation.
  const tMin = withTime.reduce((m, e) => Math.min(m, e.timestampMs), withTime[0].timestampMs);
  const tMax = withTime.reduce((m, e) => Math.max(m, e.timestampMs), withTime[0].timestampMs);
  const span = Math.max(tMax - tMin, 1000);
  const bandMs = pickBandSize(span);

  const usableW = width - PAD_X * 2;
  const xForT = (ms: number) => PAD_X + ((ms - tMin) / span) * usableW;

  // Detect RTC resets: track the running maximum timestamp in recording order.
  // If an event's timestamp is more than 1 minute behind the running max it is
  // almost certainly caused by a device reboot with a battery-less RTC — the
  // clock restarted from a stale value. We flag those events so the renderer can
  // annotate them, while still plotting them at the timestamp the device reported.
  const CLOCK_RESET_THRESHOLD_MS = 60 * 1000;
  let runningMax = withTime[0].timestampMs;
  const annotated = withTime.map((e) => {
    const clockReset = e.timestampMs < runningMax - CLOCK_RESET_THRESHOLD_MS;
    if (!clockReset) runningMax = Math.max(runningMax, e.timestampMs);
    return { ...e, clockReset };
  });

  const bucketMs = span / BUCKET_COUNT;
  const grouped = new Map<number, (typeof annotated)[number][]>();
  annotated.forEach((e) => {
    const bucket = Math.round((e.timestampMs - tMin) / bucketMs);
    const list = grouped.get(bucket) ?? [];
    list.push(e);
    grouped.set(bucket, list);
  });

  const dots: TimelineDot[] = [];
  grouped.forEach((items) => {
    const cx = xForT(items[0].timestampMs);
    const n = items.length;
    const r = BASE_RADIUS + Math.min(n - 1, MAX_RADIUS_BONUS) * RADIUS_STEP;
    // Real logs can pack hundreds of events into a single bucket (e.g. a rapid
    // frame-counter burst). Spacing dots by a fixed (r+3) step with no cap pushes
    // cx far outside the 0-900 viewBox for large n. Cap the *total* spread instead,
    // so dots just overlap more tightly rather than escaping the visible timeline.
    const spacing = n > 1 ? Math.min(r + 3, MAX_BUCKET_SPREAD / (n - 1)) : 0;
    const dense = n > 1 && spacing < r;
    items.forEach((e, i) => {
      const offset = n > 1 ? (i - (n - 1) / 2) * spacing : 0;
      dots.push({ x: cx + offset, y: LANE_Y, r, dense, clockReset: e.clockReset, event: e });
    });
  });

  // Collect unique x-positions of clock-reset clusters (one marker per cluster,
  // not per dot, so only one ⚠ appears when many events share the same bucket).
  const resetXSet = new Set<number>();
  dots.forEach((d) => { if (d.clockReset) resetXSet.add(Math.round(d.x)); });
  const clockResetMarkers: ClockResetMarker[] = [...resetXSet].map((x) => ({ x }));

  return { tMin, tMax, span, bandMs, dots, xForT, clockResetMarkers };
}

export const TIMELINE_WIDTH = WIDTH;
export const TIMELINE_HEIGHT = 130;
export const TIMELINE_PAD_X = PAD_X;
export const TIMELINE_BAND_TOP_Y = 20;
export const TIMELINE_BAND_BOTTOM_Y = 120;
export const TIMELINE_LANE_Y = LANE_Y;
