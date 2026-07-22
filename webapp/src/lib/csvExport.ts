import type { LogEvent, SessionMetadata } from '../types';

// Ported from ../../script.js exportToCSV. Exports ALL events of the active file,
// independent of current highlight/time-range filters (per spec 3.5).
export function exportToCsv(fileName: string, events: LogEvent[], metadata: SessionMetadata): void {
  const headers = ['Timestamp', 'Event Type', 'Description', 'Details', 'Raw Record', 'UID', 'MAC'];
  const rows = events.map((e) => [
    e.timestampRaw ?? '',
    e.eventType,
    `"${e.description.replace(/"/g, '""')}"`,
    `"${e.details.replace(/"/g, '""')}"`,
    e.record,
    e.uid ?? metadata.uid ?? '',
    e.mac ?? metadata.mac ?? '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const baseName = fileName.replace(/\.[^/.]+$/, '') || 'system_log';
  link.setAttribute('href', url);
  link.setAttribute('download', `${baseName}_export.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
