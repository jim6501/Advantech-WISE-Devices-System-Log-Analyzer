import { useMemo } from 'react';
import type { ColorSet, LogEvent } from '../../types';
import { countByPe, isRare } from '../../lib/peColors';

interface Props {
  events: LogEvent[];
  peColorMap: Map<LogEvent['eventType'], ColorSet>;
  activeHighlights: Set<LogEvent['eventType']>;
  onToggle: (pe: LogEvent['eventType']) => void;
}

export function Legend({ events, peColorMap, activeHighlights, onToggle }: Props) {
  const counts = useMemo(() => countByPe(events), [events]);
  const total = events.length;
  const pes = Array.from(counts.keys());

  if (!pes.length) return null;

  return (
    <div className="legend-row">
      {pes.map((pe) => {
        const count = counts.get(pe) ?? 0;
        const color = peColorMap.get(pe);
        const rare = isRare(count, total);
        return (
          <div
            key={String(pe)}
            className={`legend-chip${activeHighlights.has(pe) ? ' active' : ''}`}
            style={{ color: color?.text, background: color?.bg }}
            onClick={() => onToggle(pe)}
          >
            <span className="legend-dot" style={{ background: color?.dot }} />
            PE {pe} ({count})
            {rare && <span className="legend-rare">RARE</span>}
          </div>
        );
      })}
    </div>
  );
}
