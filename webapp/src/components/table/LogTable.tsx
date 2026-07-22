import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColorSet, LogEvent, TimeRange } from '../../types';
import { countByPe, isRare, OTHER_COLOR } from '../../lib/peColors';
import { InfoTooltip } from './InfoTooltip';

interface Props {
  events: LogEvent[];
  peColorMap: Map<LogEvent['eventType'], ColorSet>;
  activeHighlights: Set<LogEvent['eventType']>;
  timeRange: TimeRange | null;
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
}

const ROW_HEIGHT = 36;

export function LogTable({ events, peColorMap, activeHighlights, timeRange, selectedIndex, onSelectIndex }: Props) {
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => countByPe(events), [events]);
  const total = events.length;
  const eventTypes = useMemo(() => Array.from(new Set(events.map((e) => e.eventType))), [events]);

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return events.filter((e) => {
      if (timeRange && e.timestampMs !== null && (e.timestampMs < timeRange.start || e.timestampMs > timeRange.end)) return false;
      if (eventTypeFilter !== 'all' && String(e.eventType) !== eventTypeFilter) return false;
      if (searchLower) {
        const haystack = `${e.description} ${e.details} ${e.record}`.toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });
  }, [events, timeRange, eventTypeFilter, search]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  useEffect(() => {
    if (selectedIndex === null) return;
    const pos = filtered.findIndex((e) => e.index === selectedIndex);
    if (pos >= 0) rowVirtualizer.scrollToIndex(pos, { align: 'center' });
  }, [selectedIndex, filtered, rowVirtualizer]);

  return (
    <div>
      <div className="filter-row">
        <input type="text" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}>
          <option value="all">All Event Types</option>
          {eventTypes.map((t) => (
            <option key={String(t)} value={String(t)}>
              PE {t}
            </option>
          ))}
        </select>
      </div>
      <p className="timezone-note">Times shown in your browser's local timezone.</p>
      <div className="table-container">
        <div className="table-head-row">
          <span className="col-idx">#</span>
          <span className="col-time">Timestamp</span>
          <span className="col-pe">PE</span>
          <span className="col-type">Description</span>
          <span className="col-desc">Details</span>
          <span className="col-raw">Raw</span>
          <span className="col-info">Info</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">{events.length === 0 ? 'No logs loaded yet.' : 'No events in this range/filter.'}</div>
        ) : (
          <div ref={scrollRef} className="table-scroll">
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const e = filtered[vi.index];
                const color = peColorMap.get(e.eventType) ?? OTHER_COLOR;
                const rare = isRare(counts.get(e.eventType) ?? 0, total);
                const dimmed = activeHighlights.size > 0 && !activeHighlights.has(e.eventType);
                const selected = selectedIndex === e.index;
                return (
                  <div
                    key={e.index}
                    className={`table-row${rare ? ' rare' : ''}${selected ? ' selected' : ''}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: vi.size,
                      transform: `translateY(${vi.start}px)`,
                      borderLeft: `3px solid ${color.dot}`,
                      opacity: dimmed ? 0.35 : 1,
                    }}
                    onClick={() => onSelectIndex(e.index)}
                  >
                    <span className="col-idx">{e.index}</span>
                    <span className="col-time">{e.timestampMs !== null ? new Date(e.timestampMs).toLocaleString() : e.timestampRaw}</span>
                    <span className="col-pe" style={{ color: color.text }}>
                      {e.eventType}
                    </span>
                    <span className="col-type" title={e.description}>
                      {e.description}
                    </span>
                    <span className="col-desc" title={e.details}>
                      {e.details}
                    </span>
                    <span className="col-raw" title={e.record}>
                      {e.record}
                    </span>
                    <span className="col-info">{e.info && <InfoTooltip text={e.info} />}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
