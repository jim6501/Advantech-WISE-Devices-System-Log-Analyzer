import { describe, it, expect } from 'vitest';
import { buildTimelineLayout, TIMELINE_WIDTH } from '../src/lib/timelineLayout';
import type { LogEvent } from '../src/types';

function makeEvent(index: number, timestampMs: number): LogEvent {
  return {
    index,
    timestampRaw: new Date(timestampMs).toISOString(),
    timestampMs,
    eventType: 15,
    description: 'RF Event',
    details: '',
    record: '00000000',
    info: null,
  };
}

describe('buildTimelineLayout', () => {
  it('keeps every dot within the SVG viewBox even when hundreds of events collide in one bucket', () => {
    // Simulates a real-world rapid frame-counter burst: 400 events within the same
    // narrow index window, all landing in the same density bucket.
    const dayMs = 24 * 60 * 60 * 1000;
    const burstStart = Date.parse('2025-06-05T00:00:00Z');
    const events: LogEvent[] = [makeEvent(1, burstStart - 6 * dayMs)];
    for (let i = 0; i < 400; i++) {
      events.push(makeEvent(i + 2, burstStart + i * 1000));
    }
    // One more event further along the index axis so the burst really does
    // collapse into a single bucket relative to the overall timeline.
    events.push(makeEvent(402, burstStart + 6 * dayMs));

    const layout = buildTimelineLayout(events);
    expect(layout).not.toBeNull();

    // A bounded margin (bucket spread + max dot radius) around the viewBox is fine —
    // what must never happen is cx running off into the thousands, as it did before
    // the fix (n=400 * step with no cap pushed dots to roughly +/-1500).
    const MARGIN = 80;
    for (const dot of layout!.dots) {
      expect(dot.x).toBeGreaterThanOrEqual(-MARGIN);
      expect(dot.x).toBeLessThanOrEqual(TIMELINE_WIDTH + MARGIN);
    }
  });

  it('positions dots by index, not by timestamp, so an RTC reset never distorts the x-axis', () => {
    // A device reboot mid-log resets its RTC, so timestamps jump backwards even
    // though recording order (index) keeps advancing normally.
    const events: LogEvent[] = [
      makeEvent(0, Date.parse('2025-06-05T12:00:00Z')),
      makeEvent(1, Date.parse('2025-06-05T12:01:00Z')),
      makeEvent(2, Date.parse('2019-01-01T00:00:00Z')), // RTC reset — timestamp jumps way back
      makeEvent(3, Date.parse('2019-01-01T00:01:00Z')),
    ];

    const layout = buildTimelineLayout(events);
    expect(layout).not.toBeNull();

    // x positions should be monotonically non-decreasing with index, unaffected by
    // the timestamp discontinuity between index 1 and 2.
    const xs = layout!.dots.slice().sort((a, b) => a.event.index - b.event.index).map((d) => d.x);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]);
    }

    // The reset event should still be annotated as a clock reset for the UI warning.
    const resetDot = layout!.dots.find((d) => d.event.index === 2);
    expect(resetDot?.clockReset).toBe(true);
  });
});
