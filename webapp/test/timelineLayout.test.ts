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
    // narrow time window, all landing in the same density bucket. Events are kept
    // in chronological array order, matching real raw log files (buildTimelineLayout
    // takes the first/last array entries as tMin/tMax, same as the real device logs
    // this is built from — they are never re-sorted).
    const dayMs = 24 * 60 * 60 * 1000;
    const burstStart = Date.parse('2025-06-05T00:00:00Z');
    const events: LogEvent[] = [makeEvent(1, burstStart - 6 * dayMs)];
    for (let i = 0; i < 400; i++) {
      events.push(makeEvent(i + 2, burstStart + i * 1000));
    }
    // One more event spread across a much wider span so the burst really does
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
});
