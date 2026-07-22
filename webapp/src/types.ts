export type ProductSeries = 'wifi' | 'nbiot' | 'lora' | 'lan';

export interface RawLogEntry {
  TIM?: string | number;
  PE?: number;
  Record?: string;
  UID?: string;
  MAC?: string;
  [key: string]: unknown;
}

export interface LogEvent {
  index: number; // global unique sequence — the only key used for row targeting/scrolling
  timestampRaw: string | number | null;
  timestampMs: number | null;
  eventType: number | string;
  description: string;
  details: string;
  record: string;
  info: string | null;
  uid?: string;
  mac?: string;
}

export interface SessionMetadata {
  uid?: string;
  mac?: string;
}

export interface Session {
  id: number;
  fileName: string;
  series: ProductSeries;
  rawLogs: RawLogEntry[];
  events: LogEvent[];
  metadata: SessionMetadata;
}

export interface ColorSet {
  dot: string;
  bg: string;
  text: string;
}

// Bounds are LogEvent.index values (recording-order sequence numbers), not timestamps.
export interface IndexRange {
  start: number;
  end: number;
}

export interface ParseStrategyResult {
  description?: string;
  details?: string;
  info?: string | null;
}

export interface ParseStrategy {
  parse(pe: number, record: string, index: number, allLogs: RawLogEntry[]): ParseStrategyResult;
}
