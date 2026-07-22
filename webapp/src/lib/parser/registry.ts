// Ported from ../../../parser.js — strategy registry + EVENT_DESCRIPTIONS + parseLog.
import type { ParseStrategy, ProductSeries, RawLogEntry } from '../../types';
import { wifiParser } from './wifi';
import { loraParser } from './lora';
import { nbiotParser } from './nbiot';
import { lanParser } from './lan';
import { normalizeTimestamp } from './utils';

const strategies: Record<ProductSeries, ParseStrategy> = {
  wifi: wifiParser,
  lora: loraParser,
  nbiot: nbiotParser,
  lan: lanParser,
};

type DescriptionEntry = string | ((record: string) => string);

// Central registry for Event Descriptions (Tooltips).
// Priority: Specific Product > Common.
const EVENT_DESCRIPTIONS: Record<string, Record<number, DescriptionEntry>> = {
  common: {
    7: (record: string) => {
      let action = parseInt(record.substring(0, 2), 16);
      // Fallback logic for action location
      if (action === 0) {
        const lastByte = parseInt(record.substring(6, 8), 16);
        if (lastByte >= 1 && lastByte <= 4) action = lastByte;
      }

      if (action === 3) {
        return '手動斷電(或非人為斷電)';
      }
      return 'System Start (Power On)\nLog recorded when device powers up.';
    },
    8: 'Memory Status\nShows current memory usage statistics.',
    11: 'Firmware Upgrade\nRecords a firmware update event with version details.',
  },
  wifi: {},
  lora: {},
  nbiot: {},
  lan: {},
};

export interface ParsedLogEntry {
  timestamp: string | number | null | undefined;
  eventType: number;
  description: string;
  details: string;
  record: string;
  uid: string | undefined;
  mac: string | undefined;
  info: string | null;
}

export interface ParseLogResult {
  logs: ParsedLogEntry[];
  metadata: { uid?: string; mac?: string };
}

export function parseLog(rawLogs: RawLogEntry[], series: ProductSeries): ParseLogResult {
  const strategy = strategies[series];
  const parsedLogs: ParsedLogEntry[] = [];
  let metadata: { uid?: string; mac?: string } = {};

  if (!strategy) {
    console.error(`No parser strategy found for series: ${series}`);
    return { logs: [], metadata: {} };
  }

  // Extract generic metadata from the first log if available
  if (rawLogs.length > 0) {
    metadata = {
      uid: rawLogs[0].UID,
      mac: rawLogs[0].MAC,
    };
  }

  rawLogs.forEach((log, index) => {
    const pe = Number(log.PE);
    const record = String(log.Record ?? '');

    // Common fields
    const entry: ParsedLogEntry = {
      timestamp: normalizeTimestamp(log.TIM as string | number | undefined),
      eventType: pe,
      description: 'Unknown Event',
      details: '',
      record,
      uid: log.UID,
      mac: log.MAC,
      info: null,
    };

    // Strategy specific parsing
    try {
      const result = strategy.parse(pe, record, index, rawLogs);
      if (result) {
        entry.description = result.description || entry.description;
        entry.details = result.details || entry.details;
        entry.info = result.info || null;
      }
    } catch (e) {
      console.warn(`Error parsing log index ${index}:`, e);
      entry.details = 'Error parsing record: ' + (e instanceof Error ? e.message : String(e));
    }

    // Auto-attach info from central registry if not set.
    // Priority: Specific Product > Common
    const seriesDescriptions = EVENT_DESCRIPTIONS[series] || {};
    const commonDescriptions = EVENT_DESCRIPTIONS.common || {};

    if (!entry.info) {
      const descTemplate = seriesDescriptions[pe] ?? commonDescriptions[pe];
      if (typeof descTemplate === 'function') {
        entry.info = descTemplate(record);
      } else if (descTemplate !== undefined) {
        entry.info = descTemplate;
      }
    }

    parsedLogs.push(entry);
  });

  return { logs: parsedLogs, metadata };
}
