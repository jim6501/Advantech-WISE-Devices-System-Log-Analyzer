import type { LogEvent, ProductSeries, RawLogEntry } from '../types';
import { parseLog } from './parser/registry';

export interface NormalizeResult {
  events: LogEvent[];
  metadata: { uid?: string; mac?: string };
}

// Real input format (confirmed against script.js / test data/*): { LogMsg: [{ TIM, PE, Record, UID, MAC }] }.
// A bare array is also accepted for resilience, matching the previous app's tolerance.
export function extractRawLogs(json: unknown): RawLogEntry[] {
  if (Array.isArray(json)) return json as RawLogEntry[];
  if (json && typeof json === 'object' && Array.isArray((json as { LogMsg?: unknown }).LogMsg)) {
    return (json as { LogMsg: RawLogEntry[] }).LogMsg;
  }
  throw new Error('Invalid Log Format: "LogMsg" array not found.');
}

// index is a global, stable identifier bound to each event's position in the raw
// array — the ONLY key ever used for click-to-row targeting/highlighting. Never
// use `record` or `description` for this, since duplicate values are common
// (e.g. the same data-rate-change record repeating across a session).
export function normalizeLog(rawLogs: RawLogEntry[], series: ProductSeries): NormalizeResult {
  const { logs, metadata } = parseLog(rawLogs, series);

  const events: LogEvent[] = logs
    .map((log, i) => {
      const date = log.timestamp !== null && log.timestamp !== undefined ? new Date(log.timestamp) : null;
      const timestampMs = date && !isNaN(date.getTime()) ? date.getTime() : null;
      return {
        index: i + 1,
        timestampRaw: log.timestamp ?? null,
        timestampMs,
        eventType: log.eventType,
        description: log.description,
        details: log.details,
        record: log.record,
        info: log.info,
        uid: log.uid,
        mac: log.mac,
      };
    })
    .filter((e) => e.timestampMs !== null);

  return { events, metadata };
}
