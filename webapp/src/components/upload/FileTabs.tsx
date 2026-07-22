import type { Session } from '../../types';

interface Props {
  sessions: Session[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
}

export function FileTabs({ sessions, activeId, onSelect, onRemove }: Props) {
  if (!sessions.length) return null;

  return (
    <div className="file-tabs">
      {sessions.map((s) => (
        <div key={s.id} className={`file-tab${s.id === activeId ? ' active' : ''}`} onClick={() => onSelect(s.id)}>
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
      ))}
    </div>
  );
}
