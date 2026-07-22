import type { ColorSet, LogEvent } from '../../types';
import { countByPe } from '../../lib/peColors';

interface Props {
  events: LogEvent[];
  peColorMap: Map<LogEvent['eventType'], ColorSet>;
}

// Part-to-whole share of each PE across one device's log, as a single horizontal
// stacked bar — a pie chart reads angle, which people compare worse than the
// aligned lengths a bar gives, and a bar stays legible with 5+ categories where a
// pie turns to confetti. Segments are widest-first so the dominant PE anchors the
// left edge and comparison between two device's bars starts from the same side.
export function PEDistributionBar({ events, peColorMap }: Props) {
  const total = events.length;
  if (!total) return null;

  const counts = countByPe(events);
  const segments = [...counts.entries()]
    .map(([pe, count]) => ({ pe, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);

  // Only wide-enough segments can hold a legible inline label without measuring
  // actual text width; narrower ones rely on the <title> tooltip + the Legend
  // below instead of clipping or overflowing their own segment.
  const MIN_LABEL_PCT = 10;

  return (
    <div className="pe-dist-bar" role="img" aria-label={`PE distribution: ${segments.map((s) => `PE ${s.pe} ${s.pct.toFixed(0)}%`).join(', ')}`}>
      {segments.map((s) => {
        const color = peColorMap.get(s.pe);
        return (
          <div
            key={String(s.pe)}
            className="pe-dist-segment"
            style={{ width: `${s.pct}%`, background: color?.dot ?? '#8a8a86' }}
          >
            <title>
              PE {s.pe} · {s.count} events · {s.pct.toFixed(1)}%
            </title>
            {s.pct >= MIN_LABEL_PCT && <span className="pe-dist-label">{s.pct.toFixed(0)}%</span>}
          </div>
        );
      })}
    </div>
  );
}
