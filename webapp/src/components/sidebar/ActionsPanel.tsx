interface Props {
  hasActiveSession: boolean;
  canShowFlow: boolean;
  onExport: () => void;
  onShowFlow: () => void;
  onClear: () => void;
}

export function ActionsPanel({ hasActiveSession, canShowFlow, onExport, onShowFlow, onClear }: Props) {
  return (
    <div className="panel">
      <p className="panel-title">Actions</p>
      <button className="btn primary" disabled={!hasActiveSession} onClick={onExport}>
        Export CSV
      </button>
      <button className="btn" disabled={!canShowFlow} onClick={onShowFlow}>
        Show Disconnection Flow
      </button>
      <button className="btn" disabled={!hasActiveSession} onClick={onClear}>
        Clear All
      </button>
    </div>
  );
}
