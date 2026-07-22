import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_MAX_WIDTH = 320;
const VIEWPORT_MARGIN = 10;

export function InfoTooltip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  function show() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    let left = rect.right + VIEWPORT_MARGIN;
    // Flip to the icon's left if there isn't room on the right, then clamp so the
    // box always stays fully on-screen instead of just picking whichever side is
    // "less wrong" (a table's last column sitting near the window edge can leave
    // neither side with enough room).
    if (left + TOOLTIP_MAX_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
      left = rect.left - TOOLTIP_MAX_WIDTH - VIEWPORT_MARGIN;
    }
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - TOOLTIP_MAX_WIDTH - VIEWPORT_MARGIN));
    const top = Math.max(VIEWPORT_MARGIN, rect.top);
    setPos({ top, left });
  }

  return (
    <span ref={ref} className="info-icon" onMouseEnter={show} onMouseLeave={() => setPos(null)} onClick={(e) => e.stopPropagation()}>
      !
      {pos &&
        createPortal(
          // Portaled to document.body: nested inside .table-container (overflow: hidden),
          // a position: fixed tooltip can still get clipped by that ancestor in practice,
          // so escaping the DOM subtree entirely is what actually guarantees visibility.
          <span className="global-tooltip" style={{ top: pos.top, left: pos.left, maxWidth: TOOLTIP_MAX_WIDTH }}>
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
