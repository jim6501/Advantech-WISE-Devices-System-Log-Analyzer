import { useMemo } from 'react';
import type { LogEvent } from '../../types';

// Ported from ../../../ui/stats.js
export function StatsPanel({ events }: { events: LogEvent[] }) {
  const stats = useMemo(() => {
    if (!events.length) return null;

    const validTimes = events.map((e) => e.timestampMs).filter((t): t is number => t !== null).sort((a, b) => a - b);
    const first = validTimes.length ? new Date(validTimes[0]).toLocaleString() : 'N/A';
    const last = validTimes.length ? new Date(validTimes[validTimes.length - 1]).toLocaleString() : 'N/A';

    const counts = new Map<string, number>();
    events.forEach((e) => {
      const key = `${e.eventType}: ${e.description}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8);
    const maxCount = top.length ? top[0][1] : 1;
    const remaining = sorted.length - top.length;

    return { total: events.length, first, last, top, maxCount, remaining };
  }, [events]);

  if (!stats) return null;

  return (
    <div className="panel">
      <p className="panel-title">Summary Statistics</p>
      <p className="summary-number">{stats.total.toLocaleString()}</p>
      <p className="summary-caption">Total Events</p>
      <div className="stat-range">
        <div>First: {stats.first}</div>
        <div>Last: {stats.last}</div>
      </div>
      <div>
        {stats.top.map(([key, count]) => (
          <div className="summary-row" key={key}>
            <span title={key} style={{ width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {key}
            </span>
            <span className="pe-bar-track">
              <span className="pe-bar-fill" style={{ width: `${(count / stats.maxCount) * 100}%`, background: 'var(--accent-color)' }} />
            </span>
            <span>{count}</span>
          </div>
        ))}
        {stats.remaining > 0 && <div className="summary-caption">+{stats.remaining} more event types</div>}
      </div>
    </div>
  );
}
