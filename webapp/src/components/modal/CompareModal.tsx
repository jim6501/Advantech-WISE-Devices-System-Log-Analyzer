import { useState } from 'react';
import type { IndexRange, LogEvent, Session } from '../../types';
import { Legend } from '../legend/Legend';
import { DensityTimeline } from '../timeline/DensityTimeline';
import { PEDistributionBar } from '../compare/PEDistributionBar';
import { buildPeColorMap, countByPe } from '../../lib/peColors';

interface Props {
  sessions: Session[];
  onClose: () => void;
}

// Sorts PE keys the way a reader expects: numerically when the value actually is
// one (the common case — PE is a small integer code), falling back to string
// comparison for the rare non-numeric eventType.
function comparePe(a: LogEvent['eventType'], b: LogEvent['eventType']): number {
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return String(a).localeCompare(String(b));
}

// Cross-tab of PE counts per device — one row per PE (union across all selected
// sessions, ordered by PE code), one column per device — so exact numbers can be
// read/compared directly instead of eyeballing bar widths. PEs missing from a
// device show as "—" rather than 0 (never appeared, as distinct from appeared
// zero times).
function ComparePeTable({ sessions }: { sessions: Session[] }) {
  const perSessionCounts = sessions.map((s) => countByPe(s.events));
  const allPe = new Set<LogEvent['eventType']>();
  perSessionCounts.forEach((counts) => counts.forEach((_, pe) => allPe.add(pe)));

  // Same PE code can carry different descriptions per product series/firmware
  // revision — take the first description any session reports, purely as a
  // human-readable label for the row, not a claim it's identical across devices.
  const peDescription = new Map<LogEvent['eventType'], string>();
  sessions.forEach((s) => {
    s.events.forEach((e) => {
      if (!peDescription.has(e.eventType)) peDescription.set(e.eventType, e.description);
    });
  });

  const rows = [...allPe]
    .map((pe) => ({
      pe,
      description: peDescription.get(pe) ?? '',
      counts: perSessionCounts.map((counts) => counts.get(pe) ?? 0),
    }))
    .sort((a, b) => comparePe(a.pe, b.pe));

  const totals = sessions.map((s) => s.events.length);

  return (
    <div className="compare-table-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th>PE</th>
            <th>Name</th>
            {sessions.map((s) => (
              <th key={s.id} title={s.fileName}>
                <div className="compare-table-device-name">{s.fileName}</div>
                {s.metadata.uid && <div className="compare-table-device-uid">UID {s.metadata.uid}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.pe)}>
              <td>PE {row.pe}</td>
              <td className="compare-table-name">{row.description}</td>
              {row.counts.map((count, i) => (
                <td key={i}>{count === 0 ? '—' : `${count} (${((count / totals[i]) * 100).toFixed(0)}%)`}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td />
            {totals.map((t, i) => (
              <td key={i}>{t}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Each card keeps its own highlight/zoom state, isolated from the other cards and
// from the main single-session view — comparison shouldn't leak filters between
// devices. The PE color map is also built per-session (not shared globally) so a
// color always reflects that session's own PE distribution.
function CompareCard({ session }: { session: Session }) {
  const [activeHighlights, setActiveHighlights] = useState<Set<LogEvent['eventType']>>(new Set());
  const [indexRange, setIndexRange] = useState<IndexRange | null>(null);
  const peColorMap = buildPeColorMap(session.events);

  function toggleHighlight(pe: LogEvent['eventType']) {
    setActiveHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(pe)) next.delete(pe);
      else next.add(pe);
      return next;
    });
  }

  return (
    <div className="compare-card">
      <div className="compare-card-header">
        <span className="compare-card-name" title={session.fileName}>
          {session.fileName}
        </span>
        <span className="compare-card-series">{session.series}</span>
        {session.metadata.uid && <span className="compare-card-meta">UID {session.metadata.uid}</span>}
        {session.metadata.mac && <span className="compare-card-meta">MAC {session.metadata.mac}</span>}
        <span className="compare-card-meta">{session.events.length} events</span>
      </div>
      <PEDistributionBar events={session.events} peColorMap={peColorMap} />
      <Legend events={session.events} peColorMap={peColorMap} activeHighlights={activeHighlights} onToggle={toggleHighlight} />
      <DensityTimeline
        events={session.events}
        peColorMap={peColorMap}
        activeHighlights={activeHighlights}
        keywordHighlights={[]}
        indexRange={indexRange}
        onIndexRangeChange={setIndexRange}
        onSelectIndex={() => {}}
      />
    </div>
  );
}

export function CompareModal({ sessions, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content compare-modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="modal-close" onClick={onClose}>
          &times;
        </span>
        <p className="panel-title">Comparing {sessions.length} devices ({sessions[0]?.series})</p>
        <ComparePeTable sessions={sessions} />
        <div className="compare-grid">
          {sessions.map((s) => (
            <CompareCard key={s.id} session={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
