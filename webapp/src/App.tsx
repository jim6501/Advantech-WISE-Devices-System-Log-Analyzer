import { useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Dropzone } from './components/upload/Dropzone';
import { FileTabs } from './components/upload/FileTabs';
import { ProductSeriesSelect } from './components/sidebar/ProductSeriesSelect';
import { UidPanel } from './components/sidebar/UidPanel';
import { StatsPanel } from './components/sidebar/StatsPanel';
import { ActionsPanel } from './components/sidebar/ActionsPanel';
import { Legend } from './components/legend/Legend';
import { DensityTimeline } from './components/timeline/DensityTimeline';
import { LogTable } from './components/table/LogTable';
import { DisconnectionFlowModal } from './components/modal/DisconnectionFlowModal';
import { CompareModal } from './components/modal/CompareModal';
import { useSessions } from './hooks/useSessions';
import { usePeColorMap } from './hooks/usePeColorMap';
import { extractRawLogs } from './lib/normalizeLog';
import { exportToCsv } from './lib/csvExport';
import type { IndexRange, LogEvent, ProductSeries } from './types';

function App() {
  const { sessions, activeSession, add, remove, setActive, reparseActive, clearAll } = useSessions();

  const [activeHighlights, setActiveHighlights] = useState<Set<LogEvent['eventType']>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [indexRange, setIndexRange] = useState<IndexRange | null>(null);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Reset per-file UI state whenever the active session changes, so filters from
  // one file never leak into another (spec 3.4).
  useEffect(() => {
    setActiveHighlights(new Set());
    setSelectedIndex(null);
    setIndexRange(null);
  }, [activeSession?.id]);

  // Drop any compare selections that no longer correspond to a loaded session
  // (e.g. removed via the tab's × or Clear All), so the Compare button's count
  // and the modal never reference a stale session.
  useEffect(() => {
    setCompareIds((prev) => {
      const next = new Set([...prev].filter((id) => sessions.some((s) => s.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [sessions]);

  const events = activeSession?.events ?? [];
  const peColorMap = usePeColorMap(events);

  function handleFiles(fileList: FileList) {
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const rawLogs = extractRawLogs(json);
          add(file.name, rawLogs);
        } catch (err) {
          alert(`Error parsing "${file.name}": ${err instanceof Error ? err.message : String(err)}`);
        }
      };
      reader.readAsText(file);
    });
  }

  function toggleHighlight(pe: LogEvent['eventType']) {
    setActiveHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(pe)) next.delete(pe);
      else next.add(pe);
      return next;
    });
  }

  function handleSeriesChange(series: ProductSeries) {
    reparseActive(series);
  }

  function toggleCompareId(id: number) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport() {
    if (!activeSession) return;
    exportToCsv(activeSession.fileName, activeSession.events, activeSession.metadata);
  }

  const canShowFlow = activeSession?.series === 'wifi';

  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <aside className="sidebar">
          <Dropzone onFiles={handleFiles} />
          {sessions.length > 0 && (
            <FileTabs
              sessions={sessions}
              activeId={activeSession?.id ?? null}
              compareIds={compareIds}
              onSelect={setActive}
              onRemove={remove}
              onToggleCompare={toggleCompareId}
            />
          )}
          {sessions.length > 1 && (
            <button className="btn" disabled={compareIds.size < 2} onClick={() => setShowCompareModal(true)}>
              Compare ({compareIds.size})
            </button>
          )}

          {activeSession && <ProductSeriesSelect value={activeSession.series} disabled={!activeSession} onChange={handleSeriesChange} />}
          {activeSession && <UidPanel metadata={activeSession.metadata} />}
          {activeSession && <StatsPanel events={events} />}

          <ActionsPanel
            hasActiveSession={!!activeSession}
            canShowFlow={!!canShowFlow}
            onExport={handleExport}
            onShowFlow={() => setShowFlowModal(true)}
            onClear={clearAll}
          />
        </aside>

        <main className="main-content">
          {!activeSession ? (
            <div className="table-container">
              <div className="empty-state">No logs loaded yet. Upload a JSON log file from the left panel to get started.</div>
            </div>
          ) : (
            <>
              <Legend events={events} peColorMap={peColorMap} activeHighlights={activeHighlights} onToggle={toggleHighlight} />
              <DensityTimeline
                events={events}
                peColorMap={peColorMap}
                activeHighlights={activeHighlights}
                indexRange={indexRange}
                onIndexRangeChange={setIndexRange}
                onSelectIndex={setSelectedIndex}
              />
              <LogTable
                events={events}
                peColorMap={peColorMap}
                activeHighlights={activeHighlights}
                indexRange={indexRange}
                selectedIndex={selectedIndex}
                onSelectIndex={setSelectedIndex}
              />
            </>
          )}
        </main>
      </div>

      <footer>
        <p>WISE System Log Analyzer v1.0 (React)</p>
      </footer>

      {showFlowModal && <DisconnectionFlowModal onClose={() => setShowFlowModal(false)} />}
      {showCompareModal && (
        <CompareModal sessions={sessions.filter((s) => compareIds.has(s.id))} onClose={() => setShowCompareModal(false)} />
      )}
    </div>
  );
}

export default App;
