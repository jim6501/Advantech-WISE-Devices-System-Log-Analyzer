import type { SessionMetadata } from '../../types';

export function UidPanel({ metadata }: { metadata: SessionMetadata | null }) {
  if (!metadata || (!metadata.uid && !metadata.mac)) return null;
  return (
    <div className="panel">
      <div className="uid-row">
        Device UID: <span className="uid-value">{metadata.uid || 'N/A'}</span>
      </div>
      <div className="uid-row">
        MAC: <span className="uid-value">{metadata.mac || 'N/A'}</span>
      </div>
    </div>
  );
}
