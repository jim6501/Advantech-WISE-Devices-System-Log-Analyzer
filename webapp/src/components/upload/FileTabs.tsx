import type { Session } from '../../types';

interface Props {
  sessions: Session[];
  activeId: number | null;
  compareIds: Set<number>;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
  onToggleCompare: (id: number) => void;
}

export function FileTabs({ sessions, activeId, compareIds, onSelect, onRemove, onToggleCompare }: Props) {
  if (!sessions.length) return null;

  // Once at least one session is checked for comparison, only sessions of the same
  // product series can be added — mixing series would let identical PE codes mean
  // different things side by side, which is more misleading than useful.
  const lockedSeries = compareIds.size > 0 ? sessions.find((s) => compareIds.has(s.id))?.series ?? null : null;

  return (
    <div className="file-tabs">
      {sessions.map((s) => {
        const compareDisabled = lockedSeries !== null && s.series !== lockedSeries && !compareIds.has(s.id);
        return (
          <div key={s.id} className={`file-tab${s.id === activeId ? ' active' : ''}`} onClick={() => onSelect(s.id)}>
            <input
              type="checkbox"
              className="file-tab-compare"
              checked={compareIds.has(s.id)}
              disabled={compareDisabled}
              title={compareDisabled ? `Locked to ${lockedSeries} series for comparison` : 'Select for comparison'}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleCompare(s.id)}
            />
            <span className="file-tab-name" title={s.fileName}>
              {s.fileName}
            </span>
            <span
              className="file-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(s.id);
              }}
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}
