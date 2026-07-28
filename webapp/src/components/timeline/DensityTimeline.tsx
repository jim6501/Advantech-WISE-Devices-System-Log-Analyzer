import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ColorSet, IndexRange, KeywordHighlight, LogEvent } from '../../types';
import { matchKeywordHighlight } from '../../lib/peColors';
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
  keywordHighlights: KeywordHighlight[];
  indexRange: IndexRange | null;
  onIndexRangeChange: (range: IndexRange | null) => void;
  onSelectIndex: (index: number) => void;
}

const MIN_EVENTS_TO_SHOW = 15;

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function DensityTimeline({ events, peColorMap, activeHighlights, keywordHighlights, indexRange, onIndexRangeChange, onSelectIndex }: Props) {
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
  // fix. Clearing the selection (indexRange -> null) falls back to the full dataset.
  const visibleEvents = useMemo(() => {
    if (!indexRange) return events;
    const filtered = events.filter((e) => e.index >= indexRange.start && e.index <= indexRange.end);
    // Defensive fallback: never let the panel (and its "clear" button) disappear
    // entirely just because a filter edge case matched zero events.
    return filtered.length ? filtered : events;
  }, [events, indexRange]);

  const layout = useMemo(() => buildTimelineLayout(visibleEvents, width), [visibleEvents, width]);

  if (!layout || events.length < MIN_EVENTS_TO_SHOW) return null;

  const { iMin, iMax, bandSize, dots, xForIndex, clockResetMarkers, tStart, tEnd } = layout;

  // Index -> nearest known timestamp, so the drag-selection label can show a real
  // time alongside the index even though the dragged boundary rarely lands exactly
  // on an event's index. Sorted once per layout for binary search.
  const timeByIndex = [...dots].sort((a, b) => a.event.index - b.event.index);
  function nearestTime(index: number): number | null {
    if (!timeByIndex.length) return null;
    let lo = 0;
    let hi = timeByIndex.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (timeByIndex[mid].event.index < index) lo = mid + 1;
      else hi = mid;
    }
    const candidates = [timeByIndex[lo]];
    if (lo > 0) candidates.push(timeByIndex[lo - 1]);
    candidates.sort((a, b) => Math.abs(a.event.index - index) - Math.abs(b.event.index - index));
    return candidates[0].event.timestampMs;
  }

  const bands: { x1: number; x2: number; shaded: boolean; label: string }[] = [];
  let idx = 0;
  for (let i = iMin; i < iMax; i += bandSize) {
    bands.push({
      x1: xForIndex(i),
      x2: xForIndex(Math.min(i + bandSize, iMax)),
      shaded: idx % 2 === 1,
      label: formatBandLabel(i),
    });
    idx++;
  }

  function clientXToSvgX(clientX: number): number {
    const rect = containerRef.current!.getBoundingClientRect();
    return clientX - rect.left;
  }

  function svgXToIndex(x: number): number {
    const usableW = width - TIMELINE_PAD_X * 2;
    const indexSpan = iMax - iMin;
    return Math.round(iMin + Math.max(0, (x - TIMELINE_PAD_X) / usableW) * indexSpan);
  }

  const previewRange: IndexRange | null = drag
    ? {
        start: svgXToIndex(Math.min(drag.startX, drag.curX)),
        end: svgXToIndex(Math.max(drag.startX, drag.curX)),
      }
    : indexRange;

  const displayRange = drag && Math.abs(drag.curX - drag.startX) > 5 ? previewRange : indexRange;
  const displayStartMs = displayRange ? nearestTime(displayRange.start) : null;
  const displayEndMs = displayRange ? nearestTime(displayRange.end) : null;

  return (
    <div className="timeline-panel">
      <p className="timeline-caption">
        {indexRange
          ? `Zoomed to ${visibleEvents.length} of ${events.length} events — drag to narrow further, or clear to reset`
          : 'Drag to select a range — click a dot to jump to that row'}
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
              onIndexRangeChange({
                start: svgXToIndex(Math.min(drag.startX, drag.curX)),
                end: svgXToIndex(Math.max(drag.startX, drag.curX)),
              });
            } else if (indexRange) {
              // plain click on empty space clears the current selection
              onIndexRangeChange(null);
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

          {/* RTC clock-reset markers — shown as dashed amber lines with a ⚠ label.
               Each marker represents a cluster of events whose timestamp jumped
               significantly backwards compared to the preceding recording sequence,
               most likely caused by a device reboot with no battery-backed RTC. The
               x-axis itself is index-based so this never distorts dot positions —
               it's purely an annotation that the timestamp may be unreliable. */}
          {clockResetMarkers.map((m, i) => (
            <g key={`rtc-${i}`} style={{ cursor: 'help' }}>
              <title>
                {'Possible RTC reset — these events have timestamps earlier than the preceding records.\n' +
                  'This is typically caused by a device reboot where the real-time clock lost its setting.\n' +
                  'The dot position (by recording index) is unaffected; only the displayed timestamp may be unreliable.'}
              </title>
              {/* dashed vertical guide line */}
              <line
                x1={m.x} y1={TIMELINE_BAND_TOP_Y + 16}
                x2={m.x} y2={TIMELINE_LANE_Y - 10}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              {/* amber warning badge circle */}
              <circle cx={m.x} cy={TIMELINE_BAND_TOP_Y + 10} r={8} fill="#f59e0b" fillOpacity={0.15} stroke="#f59e0b" strokeWidth={1.5} />
              {/* ⚠ glyph */}
              <text
                x={m.x}
                y={TIMELINE_BAND_TOP_Y + 14}
                fontSize={9}
                textAnchor="middle"
                fill="#f59e0b"
                fontWeight="bold"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                ⚠
              </text>
            </g>
          ))}

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
                fillOpacity={dimmed ? 0.45 : 0.9}
                stroke={d.dense ? 'none' : 'var(--card-bg)'}
                strokeWidth={d.dense ? 0 : 1.5}
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onSelectIndex(d.event.index)}
              >
                <title>
                  #{d.event.index} · PE {d.event.eventType} · {d.event.description} · {formatDate(d.event.timestampMs!)}
                  {d.clockReset ? '\n⚠ Possible RTC reset — timestamp may be unreliable' : ''}
                </title>
              </circle>
            );
          })}

          {keywordHighlights.length > 0 &&
            dots.map((d, i) => {
              const match = matchKeywordHighlight(d.event, keywordHighlights);
              if (!match) return null;
              return (
                <circle
                  key={`kw-${i}`}
                  cx={d.x}
                  cy={TIMELINE_LANE_Y + 10}
                  r={3}
                  fill={match.color.dot}
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onSelectIndex(d.event.index)}
                >
                  <title>
                    Highlight "{match.keyword}" · #{d.event.index} · {d.event.description}
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
        <span>
          #{iMin} · {formatDate(tStart)}
        </span>
        <span className="timeline-sel-label">
          {displayRange
            ? `#${displayRange.start}${displayStartMs !== null ? ` · ${formatDate(displayStartMs)}` : ''}  →  ` +
              `#${displayRange.end}${displayEndMs !== null ? ` · ${formatDate(displayEndMs)}` : ''}`
            : ''}
          {indexRange && !drag && (
            <button
              className="btn"
              style={{ display: 'inline', width: 'auto', marginLeft: 8, padding: '0 6px' }}
              onClick={() => onIndexRangeChange(null)}
            >
              clear
            </button>
          )}
        </span>
        <span>
          #{iMax} · {formatDate(tEnd)}
        </span>
      </div>
    </div>
  );
}
