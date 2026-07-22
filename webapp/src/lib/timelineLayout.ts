import type { LogEvent } from '../types';

// Ported from prototype.html's renderTimeline layout logic (pickBandSize / bucketing /
// dot offsetting), decoupled from DOM so it can be unit-driven and reused by the
// DensityTimeline component and its tests.
//
// The x-axis is driven by each event's `index` (its position in the recording),
// never by its timestamp. Device RTCs can reset mid-log (e.g. a power-cycle with
// no battery backup), which makes timestamps jump backwards; a time-based axis
// either collapses the whole span to a sliver or scatters events out of their
// actual recording order. Index always increases monotonically by construction,
// so plotting against it keeps every event in its true recorded sequence and the
// spacing stable regardless of clock weirdness.

const BAND_INDEX_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];

// Dynamically picks a band size (in index count) targeting ~6-10 bands across the total span.
export function pickIndexBandSize(span: number): number {
  for (const step of BAND_INDEX_STEPS) {
    if (span / step <= 10) return step;
  }
  return BAND_INDEX_STEPS[BAND_INDEX_STEPS.length - 1];
}

export function formatBandLabel(index: number): string {
  return `#${index}`;
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
  // (e.g. after a power-cycle with no battery backup). This is purely an annotation
  // now: it no longer affects where the dot is plotted (that's driven by index).
  clockReset: boolean;
  event: LogEvent;
}

/** A position on the timeline where a clock-reset cluster was detected. */
export interface ClockResetMarker {
  /** x-pixel coordinate of the reset cluster on the canvas. */
  x: number;
}

export interface TimelineLayout {
  iMin: number;
  iMax: number;
  indexSpan: number;
  bandSize: number;
  dots: TimelineDot[];
  xForIndex: (index: number) => number;
  /** Distinct x-positions of detected RTC-reset clusters for warning annotation. */
  clockResetMarkers: ClockResetMarker[];
  /** Timestamp of the first/last event in recording order, for the range labels. */
  tStart: number;
  tEnd: number;
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

  // index is a global unique sequence assigned in recording order, so the first and
  // last entries define the span — no scanning for min/max needed the way timestamps
  // required (and no risk of an out-of-order tail collapsing the span).
  const iMin = withTime[0].index;
  const iMax = withTime[withTime.length - 1].index;
  const indexSpan = Math.max(iMax - iMin, 1);
  const bandSize = pickIndexBandSize(indexSpan);

  const usableW = width - PAD_X * 2;
  const xForIndex = (index: number) => PAD_X + ((index - iMin) / indexSpan) * usableW;

  // Detect RTC resets: compare each event's timestamp to the one immediately
  // before it in recording order. If it's more than 1 minute earlier, that's
  // almost certainly a device reboot with a battery-less RTC — the clock
  // restarted from a stale value. Only the single event where the jump actually
  // happens is flagged (not every subsequent event that also happens to still
  // read earlier than the pre-reset high-water mark), so the warning marks one
  // specific point rather than smearing across the whole post-reset run.
  const CLOCK_RESET_THRESHOLD_MS = 60 * 1000;
  let prevMs = withTime[0].timestampMs;
  const annotated = withTime.map((e, i) => {
    const clockReset = i > 0 && e.timestampMs < prevMs - CLOCK_RESET_THRESHOLD_MS;
    prevMs = e.timestampMs;
    return { ...e, clockReset };
  });

  const bucketSize = indexSpan / BUCKET_COUNT;
  const grouped = new Map<number, (typeof annotated)[number][]>();
  annotated.forEach((e) => {
    const bucket = Math.round((e.index - iMin) / bucketSize);
    const list = grouped.get(bucket) ?? [];
    list.push(e);
    grouped.set(bucket, list);
  });

  const dots: TimelineDot[] = [];
  grouped.forEach((items) => {
    const cx = xForIndex(items[0].index);
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

  return {
    iMin,
    iMax,
    indexSpan,
    bandSize,
    dots,
    xForIndex,
    clockResetMarkers,
    tStart: withTime[0].timestampMs,
    tEnd: withTime[withTime.length - 1].timestampMs,
  };
}

export const TIMELINE_WIDTH = WIDTH;
export const TIMELINE_HEIGHT = 130;
export const TIMELINE_PAD_X = PAD_X;
export const TIMELINE_BAND_TOP_Y = 20;
export const TIMELINE_BAND_BOTTOM_Y = 120;
export const TIMELINE_LANE_Y = LANE_Y;
