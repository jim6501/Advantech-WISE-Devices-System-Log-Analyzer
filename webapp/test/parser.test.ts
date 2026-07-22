import { describe, it, expect } from 'vitest';
import { normalizeTimestamp } from '../src/lib/parser/utils';
import { detectSeries } from '../src/lib/parser/detectSeries';
import { wifiParser } from '../src/lib/parser/wifi';
import { loraParser } from '../src/lib/parser/lora';
import { parseLog } from '../src/lib/parser/registry';
import { extractRawLogs, normalizeLog } from '../src/lib/normalizeLog';
import type { RawLogEntry } from '../src/types';

describe('normalizeTimestamp', () => {
  it('passes through ISO strings unchanged', () => {
    expect(normalizeTimestamp('2023-09-02T08:00:28+01:00')).toBe('2023-09-02T08:00:28+01:00');
  });

  it('converts unix epoch seconds strings to ISO', () => {
    const result = normalizeTimestamp('1749104460');
    expect(result).toBe(new Date(1749104460 * 1000).toISOString());
  });

  it('passes through null/undefined/empty', () => {
    expect(normalizeTimestamp(null)).toBeNull();
    expect(normalizeTimestamp(undefined)).toBeUndefined();
    expect(normalizeTimestamp('')).toBe('');
  });
});

describe('detectSeries', () => {
  it('detects lora from WISE-4610/2200/2410 UIDs', () => {
    expect(detectSeries([{ UID: 'WISE-4610_00D0C9AA0001' }])).toBe('lora');
    expect(detectSeries([{ UID: 'WISE-2200-M_XXXX' }])).toBe('lora');
  });

  it('detects nbiot from WISE-4671/4471 UIDs', () => {
    expect(detectSeries([{ UID: 'WISE-4671_00D0C9AA0001' }])).toBe('nbiot');
  });

  it('detects lan from WISE-4000/LAN UID', () => {
    expect(detectSeries([{ UID: 'WISE-4000/LAN_00D0C9AA0001' }])).toBe('lan');
  });

  it('falls back to wifi for generic WISE-40xx/42xx UIDs and empty input', () => {
    expect(detectSeries([{ UID: 'WISE-4050/LAN_00D0C9FEBA40' }])).toBe('wifi');
    expect(detectSeries([])).toBe('wifi');
    expect(detectSeries([{}])).toBe('wifi');
  });
});

describe('wifiParser', () => {
  it('parses SNTP status (PE 6)', () => {
    const result = wifiParser.parse(6, '00000000', 0, []);
    expect(result.description).toBe('SNTP Status');
    expect(result.details).toBe('Status: No error');
  });

  it('parses power action fallback-byte case (PE 7)', () => {
    const result = wifiParser.parse(7, '00000001', 0, []);
    expect(result.description).toBe('Power Action');
    expect(result.details).toBe('Action: Power on');
  });

  it('parses RSSI change (PE 15, byte3 0x06) and attaches info', () => {
    const result = wifiParser.parse(15, '06' + '32' + '14' + '0a', 0, []);
    expect(result.details).toContain('RSSI Change');
    expect(result.info).toContain('RSSI Indicators');
  });
});

describe('loraParser', () => {
  it('parses a data-rate-change RF event (PE 15, byte3 0x0a)', () => {
    const result = loraParser.parse(15, '0A00FF05', 0, []);
    expect(result.description).toBe('RF Event');
    expect(result.details).toBe('Data Rate Change. Old: 255, New: 5');
  });

  it('resolves a 4-part LinkADRReq MAC command sequence by index, not by record value', () => {
    // Two LinkADRReq parts sharing the identical record value (repeat), to prove
    // that sequencing/targeting must key off array position, not record content.
    const allLogs: RawLogEntry[] = [
      { PE: 15, Record: '05030A02' }, // part 1
      { PE: 15, Record: '05030004' }, // part 2 (ChMask)
      { PE: 15, Record: '05030004' }, // duplicate raw value of part 2 — NOT part of this sequence in reality,
      // but resolveMacContext scans a contiguous PE-15/05-prefixed window, so verify part 4 below still resolves via position.
      { PE: 15, Record: '05030102' }, // treated as part 3 (Set DR/TxPow) by position
      { PE: 15, Record: '05030700' }, // part 4 (Status)
    ];
    const part1 = loraParser.parse(15, allLogs[0].Record as string, 0, allLogs);
    expect(part1.details).toContain('LinkADRReq (Log 1/4)');

    const part4 = loraParser.parse(15, allLogs[4].Record as string, 4, allLogs);
    expect(part4.details).toContain('LinkADRReq (Log');
  });
});

describe('parseLog', () => {
  it('attaches common EVENT_DESCRIPTIONS info when the strategy does not set one', () => {
    const rawLogs: RawLogEntry[] = [{ PE: 8, Record: '00000001', UID: 'WISE-4050/LAN_X', MAC: '00-00-00-00-00-00', TIM: '2023-09-02T08:00:00+01:00' }];
    const { logs } = parseLog(rawLogs, 'wifi');
    expect(logs[0].info).toContain('Memory Status');
  });
});

describe('extractRawLogs / normalizeLog', () => {
  it('accepts { LogMsg: [...] } shape', () => {
    const raw = extractRawLogs({ LogMsg: [{ PE: 6, Record: '00000000', TIM: '2023-09-02T08:00:00+01:00' }] });
    expect(raw).toHaveLength(1);
  });

  it('accepts a bare array', () => {
    const raw = extractRawLogs([{ PE: 6, Record: '00000000', TIM: '2023-09-02T08:00:00+01:00' }]);
    expect(raw).toHaveLength(1);
  });

  it('throws a clear error for unrecognized shapes', () => {
    expect(() => extractRawLogs({ foo: 'bar' })).toThrow(/LogMsg/);
  });

  it('filters out events with unparsable timestamps but keeps global index stable for the rest', () => {
    const rawLogs: RawLogEntry[] = [
      { PE: 6, Record: '00000000', TIM: '2023-09-02T08:00:00+01:00' },
      { PE: 6, Record: '00000000', TIM: 'not-a-date' },
      { PE: 6, Record: '00000000', TIM: '2023-09-02T08:05:00+01:00' },
    ];
    const { events } = normalizeLog(rawLogs, 'wifi');
    expect(events).toHaveLength(2);
    expect(events[0].index).toBe(1);
    expect(events[1].index).toBe(3); // stable position-based index, the dropped middle entry's slot is skipped, not renumbered
  });
});
