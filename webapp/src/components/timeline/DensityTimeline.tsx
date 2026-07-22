import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ColorSet, LogEvent, TimeRange } from '../../types';
import {
  buildTimelineLayout,
  formatBandLabel,
  TIMELINE_BAND_BOTTOM_Y,
  TIMELINE_BAND_TOP_Y,
  TIMELINE_HEIGHT,
  TIMELINE_LANE_Y,
  TIMELINE_PAD_X,
  TIMELINE_WIDTH,
} from '../../lib/timelineLayout';

interface Props {
  events: LogEvent[];
  peColorMap: Map<LogEvent['eventType'], ColorSet>;
  activeHighlights: Set<LogEvent['eventType']>;
  timeRange: TimeRange | null;
  onTimeRangeChange: (range: TimeRange | null) => void;
  onSelectIndex: (index: number) => void;
}

const MIN_EVENTS_TO_SHOW = 15;

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function DensityTimeline({ events, peColorMap, activeHighlights, timeRange, onTimeRangeChange, onSelectIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ startX: number; curX: number } | null>(null);
  // Falls back to the logical TIMELINE_WIDTH until the first real measurement lands,
  // then tracks the container's actual pixel width. Using this as the SVG's viewBox
  // width too means the render scale is always exactly 1:1 — no CSS stretching, so
  // dots stay circular and drag math never drifts from what's drawn on screen.
  const [width, setWidth] = useState(TIMELINE_WIDTH);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measure synchronously on mount (don't wait on the first async ResizeObserver
    // callback, which some environments delay or skip) so the very first paint
    // already uses the real pixel width; ResizeObserver then just tracks later
    // resizes (window resize, sidebar toggle, etc).
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w) setWidth((prev) => (Math.round(w) !== Math.round(prev) ? w : prev));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Once a range is selected, zoom the timeline itself to just that range (instead of
  // only filtering the table below) — otherwise a selection on a large dataset still
  // renders every other event's dot, which is the exact clutter the zoom is meant to
  // fix. Clearing the selection (timeRange -> null) falls back to the full dataset.
  const visibleEvents = useMemo(() => {
    if (!timeRange) return events;
    const filtered = events.filter((e) => e.timestampMs !== null && e.timestampMs >= timeRange.start && e.timestampMs <= timeRange.end);
    // Defensive fallback: never let the panel (and its "clear" button) disappear
    // entirely just because a filter edge case matched zero events.
    return filtered.length ? filtered : events;
  }, [events, timeRange]);

  const layout = useMemo(() => buildTimelineLayout(visibleEvents, width), [visibleEvents, width]);

  if (!layout || events.length < MIN_EVENTS_TO_SHOW) return null;

  const { tMin, tMax, span, bandMs, dots, xForT } = layout;

  const bands: { x1: number; x2: number; shaded: boolean; label: string }[] = [];
  let idx = 0;
  for (let t = tMin; t < tMax; t += bandMs) {
    bands.push({
      x1: xForT(t),
      x2: xForT(Math.min(t + bandMs, tMax)),
      shaded: idx % 2 === 1,
      label: formatBandLabel(t, bandMs),
    });
    idx++;
  }

  function clientXToSvgX(clientX: number): number {
    const rect = containerRef.current!.getBoundingClientRect();
    return clientX - rect.left;
  }

  function svgXToTime(x: number): number {
    const usableW = width - TIMELINE_PAD_X * 2;
    return tMin + Math.max(0, (x - TIMELINE_PAD_X) / usableW) * span;
  }

  const previewRange: TimeRange | null = drag
    ? {
        start: svgXToTime(Math.min(drag.startX, drag.curX)),
        end: svgXToTime(Math.max(drag.startX, drag.curX)),
      }
    : timeRange;

  const displayRange = drag && Math.abs(drag.curX - drag.startX) > 5 ? previewRange : timeRange;

  return (
    <div className="timeline-panel">
      <p className="timeline-caption">
        {timeRange
          ? `Zoomed to ${visibleEvents.length} of ${events.length} events — drag to narrow further, or clear to reset`
          : 'Drag to select a time range — click a dot to jump to that row'}
      </p>
      <div
        className="timeline-wrap"
        ref={containerRef}
        onMouseDown={(e) => {
          const x = clientXToSvgX(e.clientX);
          setDrag({ startX: x, curX: x });
        }}
        onMouseMove={(e) => {
          if (!drag) return;
          setDrag({ startX: drag.startX, curX: clientXToSvgX(e.clientX) });
        }}
        onMouseUp={() => {
          if (drag) {
            const dragWidth = Math.abs(drag.curX - drag.startX);
            if (dragWidth > 5) {
              onTimeRangeChange({
                start: svgXToTime(Math.min(drag.startX, drag.curX)),
                end: svgXToTime(Math.max(drag.startX, drag.curX)),
              });
            } else if (timeRange) {
              // plain click on empty space clears the current selection
              onTimeRangeChange(null);
            }
          }
          setDrag(null);
        }}
        onMouseLeave={() => setDrag(null)}
      >
        <svg width={width} height={TIMELINE_HEIGHT} viewBox={`0 0 ${width} ${TIMELINE_HEIGHT}`} style={{ display: 'block', overflow: 'hidden' }}>
          {bands.map((b, i) => (
            <g key={i}>
              <rect
                x={b.x1}
                y={TIMELINE_BAND_TOP_Y}
                width={b.x2 - b.x1}
                height={TIMELINE_BAND_BOTTOM_Y - TIMELINE_BAND_TOP_Y}
                fill={b.shaded ? 'var(--timeline-band-b)' : 'var(--timeline-band-a)'}
              />
              <line x1={b.x1} y1={TIMELINE_BAND_TOP_Y} x2={b.x1} y2={TIMELINE_BAND_BOTTOM_Y} stroke="var(--border-color)" strokeWidth={1} />
              <text x={b.x1 + 4} y={TIMELINE_BAND_TOP_Y + 12} fontSize={10} fill="var(--text-muted)">
                {b.label}
              </text>
            </g>
          ))}
          <line x1={TIMELINE_PAD_X} y1={TIMELINE_LANE_Y} x2={width - TIMELINE_PAD_X} y2={TIMELINE_LANE_Y} stroke="var(--border-color)" strokeWidth={1} />

          {dots.map((d, i) => {
            const color = peColorMap.get(d.event.eventType);
            const dimmed = activeHighlights.size > 0 && !activeHighlights.has(d.event.eventType);
            return (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={d.r}
                fill={color?.dot ?? '#8a8a86'}
                fillOpacity={dimmed ? 0.2 : 0.9}
                stroke={d.dense ? 'none' : 'var(--card-bg)'}
                strokeWidth={d.dense ? 0 : 1.5}
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onSelectIndex(d.event.index)}
              >
                <title>
                  #{d.event.index} · {d.event.description} · {formatDate(d.event.timestampMs!)}
                </title>
              </circle>
            );
          })}

          {previewRange && drag && (
            <rect
              x={Math.min(drag.startX, drag.curX)}
              y={TIMELINE_BAND_TOP_Y}
              width={Math.abs(drag.curX - drag.startX)}
              height={TIMELINE_BAND_BOTTOM_Y - TIMELINE_BAND_TOP_Y}
              fill="rgba(55,138,221,0.15)"
              stroke="var(--primary-color)"
              strokeWidth={1}
            />
          )}
        </svg>
      </div>
      <div className="timeline-range-labels">
        <span>{formatDate(tMin)}</span>
        <span className="timeline-sel-label">
          {displayRange ? `${formatDate(displayRange.start)}  →  ${formatDate(displayRange.end)}` : ''}
          {timeRange && !drag && (
            <button
              className="btn"
              style={{ display: 'inline', width: 'auto', marginLeft: 8, padding: '0 6px' }}
              onClick={() => onTimeRangeChange(null)}
            >
              clear
            </button>
          )}
        </span>
        <span>{formatDate(tMax)}</span>
      </div>
    </div>
  );
}
