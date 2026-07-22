// Ported 1:1 from ../../../parsers/lora_parser.js — do not change the parsing logic, only types/imports.
import type { ParseStrategy, ParseStrategyResult, RawLogEntry } from '../../types';

export const loraParser: ParseStrategy = {
  parse(pe: number, record: string, index: number, allLogs: RawLogEntry[]): ParseStrategyResult {
    let description = '';
    let details = '';

    switch (pe) {
      case 1:
        description = 'Wireless Connection';
        details = `Raw Data: ${record}`;
        break;
      case 7:
        description = 'Power On/Off';
        {
          let action = parseInt(record.substring(0, 2), 16);
          let cause = parseInt(record.substring(2), 16);

          // Fallback: if Action is 0, check if it's stored in the last byte (Little Endian / distinct format)
          if (action === 0) {
            const lastByte = parseInt(record.substring(6, 8), 16);
            if (lastByte >= 1 && lastByte <= 4) {
              action = lastByte;
              cause = parseInt(record.substring(0, 6), 16);
            }
          }

          const actionMap: Record<number, string> = { 1: 'Power on', 2: 'System restart', 3: 'Power off', 4: 'CoreTask WDT timeout' };
          let detailStr = `Action: ${actionMap[action] || action}`;

          if (action === 2) {
            const causeMap: Record<number, string> = {
              1: 'F/W image load complete',
              2: 'RESTful Restart command',
              3: 'LoRa configurations changed',
              4: 'RESTful Reset to Default',
              5: 'Restart from LoRaWAN downlink',
              6: 'Power detected during low battery',
              7: 'ASCII restart command',
              8: 'I/O connector pin test complete',
            };
            detailStr += `, Cause: ${causeMap[cause] || cause}`;
          }
          details = detailStr;
        }
        break;
      case 12:
        description = 'Battery Info';
        {
          const idx = parseInt(record.substring(0, 2), 16);
          const valHex = record.substring(2);
          const val = parseInt(valHex, 16);

          switch (idx) {
            case 0:
              details = `Battery Warning: ${val === 1 ? 'Low Battery' : val}`;
              break;
            case 1:
              // Value is directly voltage in mV (ex: 000DB5 => 3509 mV)
              {
                const mv = parseInt(valHex, 16);
                details = `Battery Voltage: ${(mv / 1000).toFixed(3)} V`;
              }
              break;
            default:
              details = `Battery Info Index: ${idx}, Value: ${valHex}`;
          }
        }
        break;
      case 13:
        description = 'Config Error';
        {
          const mode = parseInt(record.substring(0, 2), 16);
          const data = parseInt(record.substring(2), 16);
          if (mode === 0) {
            const map = ['Device info', 'LoRa setting', 'IO setting', 'DI count', 'System log', 'RS485', 'Modbus RTU', 'Position', 'IO log', 'Modbus RTU exp'];
            const errors: string[] = [];
            for (let i = 0; i < map.length; i++) if (data & (1 << i)) errors.push(map[i]);
            details = errors.length ? 'Errors: ' + errors.join(', ') : 'No Errors';
          } else if (mode === 1) {
            const reasons = ['Table not found', 'Web command', 'I/O change', 'ASCII command'];
            details = `Reset Cause: ${reasons[data] || data}`;
          } else {
            details = `Mode: ${mode}, Data: ${record.substring(2)}`;
          }
        }
        break;
      case 15:
        description = 'RF Event';
        details = parseRfEvent(record, index, allLogs);
        break;
      case 11:
        description = 'FW Upgrade';
        {
          // Ex: 0A100B01 => A1.00 B01
          const b3 = parseInt(record.substring(0, 2), 16);
          const b2 = parseInt(record.substring(2, 4), 16);
          const b1 = parseInt(record.substring(4, 6), 16);
          const b0 = parseInt(record.substring(6, 8), 16);

          // Byte 3: Major Letter (0A -> A)
          const majorLet = b3.toString(16).toUpperCase();
          // Byte 2 High: Major Version (2)
          const verMaj = (b2 >> 4).toString(16);
          // Byte 2 Low + Byte 1 High: Minor Version (0 + 5 -> 05)
          const verMinHigh = (b2 & 0x0f).toString(16);
          const verMinLow = (b1 >> 4).toString(16);
          const verMin = `${verMinHigh}${verMinLow}`;
          // Byte 1 Low: Type Letter (B -> B)
          const typeLet = (b1 & 0x0f).toString(16).toUpperCase();
          // Byte 0: Build (00 -> 00)
          const build = b0.toString(16).toUpperCase().padStart(2, '0');

          details = `Version: ${majorLet}${verMaj}.${verMin} ${typeLet}${build} (Raw: ${record})`;
        }
        break;
      case 18:
        description = 'Hardware Event';
        {
          const modIdx = parseInt(record.substring(0, 2), 16);
          const errDetails = record.substring(2);
          let moduleName = `Unknown Module (${modIdx})`;
          if (modIdx === 1) moduleName = 'I/O Module';
          else if (modIdx === 2) moduleName = 'Serial Command Error Event';

          details = `Module: ${moduleName}, Error Details: ${errDetails}`;
        }
        break;
      case 8:
        description = 'Memory Status';
        {
          const statusVal = parseInt(record, 16);
          const statusMap: Record<number, string> = {
            1: 'IO full',
            2: 'IO overwrite',
            3: 'System overwrite',
          };
          details = `Status: ${statusMap[statusVal] || statusVal} (Raw: ${record})`;
        }
        break;
      case 14:
        description = 'Flash Error';
        {
          const eventType = parseInt(record.substring(0, 2), 16);
          const dataContent = record.substring(2);
          const dataVal = parseInt(dataContent, 16);
          const eventMap: Record<number, string> = {
            1: 'Read',
            2: 'Write',
            3: 'Length',
            4: 'Error Length',
            5: 'Protect Address',
            6: 'Erase',
            7: 'Erase Size',
            8: 'Erase Protect Address',
            9: 'Out of Sector',
          };
          const eventDesc = eventMap[eventType] || `Unknown (${eventType})`;
          if (eventType === 7) {
            const sizeMap: Record<number, string> = { 0: '32K', 1: '4K', 2: '64K' };
            details = `Operation: ${eventDesc}, Size: ${sizeMap[dataVal] || dataVal} (Raw: ${record})`;
          } else {
            details = `Operation: ${eventDesc}, Data/Address: 0x${dataContent} (Raw: ${record})`;
          }
        }
        break;
      default:
        details = `Data: ${record}`;
    }
    return { description, details };
  },
};

function parseRfEvent(record: string, index: number, allLogs: RawLogEntry[]): string {
  const byte3 = parseInt(record.substring(0, 2), 16);
  const otherBytes = record.substring(2);

  switch (byte3) {
    case 0x01:
      return 'Join fail';
    case 0x02:
      return 'RF initial fail';
    case 0x03:
      return `Connect fail. Status: ${otherBytes}`;
    case 0x04: {
      const stackEvents: Record<number, string> = {
        0: 'Connected',
        1: 'Disconnected',
        3: 'Tx timeout',
        4: 'Tx error',
        6: 'Tx scheduling error',
        7: 'Rx done',
        8: 'Rx timeout',
        9: 'Rx error',
        10: 'Join failure',
        12: 'Automatic uplink error',
      };
      const code = parseInt(otherBytes, 16);
      return `Stack Event: ${stackEvents[code] || code}`;
    }
    case 0x05:
      // MAC Command Detailed Parsing
      return parseMacCommand(record, index, allLogs);
    case 0x06: {
      const type = parseInt(record.substring(2, 4), 16);
      const val = parseInt(record.substring(4), 16);
      const typeMap: Record<number, string> = { 1: 'Uplink', 2: 'Downlink', 3: 'Difference' };
      return `Frame Counter (${typeMap[type] || type}): ${val}`;
    }
    case 0x07:
    case 0x08: {
      const errCat = parseInt(record.substring(2, 4), 16);
      const errMap: Record<number, string> = {
        0x00: 'Event Code',
        0x01: 'Initialize Error',
        0x02: 'Set Join Error',
        0x03: 'Get Join Error',
        0x04: 'Set Channel Plan Error',
        0x05: 'Get Channel Plan Error',
        0x06: 'Set Join Config Error',
        0x07: 'Get Join Config Error',
        0x08: 'Set Send Error',
        0x09: 'Send Error',
        0x0a: 'Receive Error',
        0x0b: 'Internal Stack Error',
        0x0c: 'Downlink Frame Error',
        0x0d: 'Downlink Parsed Error',
      };
      return `Error (${byte3 === 7 ? 'Event' : 'Send'}): ${errMap[errCat] || 'Unknown'} (Cat ${errCat})`;
    }
    case 0x09:
      return `Downlink Frame. Payload: ${otherBytes}`;
    case 0x0a: {
      const originalDr = parseInt(record.substring(4, 6), 16);
      const newDr = parseInt(record.substring(6, 8), 16);
      return `Data Rate Change. Old: ${originalDr}, New: ${newDr}`;
    }
    default:
      return `RF Event ${byte3}. Data: ${otherBytes}`;
  }
}

function parseMacCommand(record: string, index: number, allLogs: RawLogEntry[]): string {
  // Whether or not cmdId is recognized, resolveMacContext handles sequence
  // numbering correctly (including continuation/orphan logs).
  return resolveMacContext(record, index, allLogs);
}

interface ActiveCmd {
  name: string;
  total: number;
  currentPart: number;
}

function resolveMacContext(record: string, index: number, allLogs: RawLogEntry[]): string {
  // To determine the context of the current log, we simulate parsing from a bit earlier.
  // This safeguards against "Repeating IDs" (like LinkADRReq) looking like new headers.

  // 1. Definition of Commands
  const specs: Record<number, { name: string; total: number }> = {
    0x03: { name: 'LinkADRReq', total: 4 },
    0x05: { name: 'RXParamSetupReq', total: 3 },
    0x07: { name: 'NewChannelReq', total: 3 },
    0x0a: { name: 'DlChannelReq', total: 3 },
  };
  const singles: Record<number, string> = {
    0x02: 'LinkCheckAns',
    0x04: 'DutyCycleReq',
    0x06: 'DevStatusReq',
    0x08: 'RXTimingSetupReq',
    0x09: 'TxParamSetupReq',
  };

  // Helper to check if a log record is a potential MAC Header (Valid ID in Byte 2)
  const getCmdId = (rec: string | undefined): number | null => {
    // Must be PE 15 and start with 05
    if (!rec || !rec.startsWith('05')) return null;
    return parseInt(rec.substring(2, 4), 16);
  };

  // 2. Define Scanning Window
  // We look back reasonably far to sync (LinkADRReq is 4 logs, so 10 is safe enough)
  const lookBack = 10;
  const startIdx = Math.max(0, index - lookBack);

  // 3. Simulate State
  let activeCmd: ActiveCmd | null = null;

  for (let i = startIdx; i <= index; i++) {
    const log = allLogs[i];
    if (log.PE !== 15) {
      activeCmd = null; // Reset on non-MAC logs (assuming MAC sequences are contiguous)
      continue;
    }

    const rec = log.Record ?? '';
    // Pre-check if Rec is a valid MAC container (starts with 05)
    if (!rec.startsWith('05')) {
      activeCmd = null;
      continue;
    }

    if (activeCmd) {
      // We are inside a command sequence
      activeCmd.currentPart++;

      if (i === index) {
        // This is our target log!
        return formatMacDetails(activeCmd.name, activeCmd.currentPart, activeCmd.total, rec);
      }

      // specific check for sequence completeness
      if (activeCmd.currentPart >= activeCmd.total) {
        activeCmd = null; // Sequence done
      }
    } else {
      // We are looking for a Start
      const id = getCmdId(rec);

      if (id !== null && specs[id]) {
        // Found a Multi-part Header
        activeCmd = { name: specs[id].name, total: specs[id].total, currentPart: 1 };

        if (i === index) {
          return formatMacDetails(activeCmd.name, 1, activeCmd.total, rec);
        }
      } else if (id !== null && singles[id]) {
        // Single part command
        if (i === index) {
          return formatMacDetails(singles[id], 1, 1, rec);
        }
      } else {
        // Unknown or Orphaned Continuation
        if (i === index) {
          return `MAC Command: Unknown/Continuation. Data: ${rec.substring(2)}`;
        }
      }
    }
  }

  return `MAC Command: Parse Error. Data: ${record.substring(2)}`;
}

function formatMacDetails(name: string, seq: number, total: number, record: string): string {
  const b2 = parseInt(record.substring(2, 4), 16);
  const b1 = parseInt(record.substring(4, 6), 16);
  const b0 = parseInt(record.substring(6, 8), 16);
  let info = `${name} (Log ${seq}/${total})`;

  // Helper to decode status bits: 1=OK, 0=Fail
  const statusStr = (val: number, bit: number, label: string) => `${label}:${(val >> bit) & 1 ? 'OK' : 'Fail'}`;

  if (name === 'LinkADRReq') {
    // All logs have ID 03
    if (seq === 1) info += `: DR:${b1 >> 4}, TXPower:${b1 & 0x0f}, Redundancy:0x${b0.toString(16)}`;
    else if (seq === 2) info += `: ChMask: 0x${b0.toString(16).padStart(2, '0')}${b1.toString(16).padStart(2, '0')}`;
    else if (seq === 3) info += `: Set DR:${b1}, Set TxPow:${b0}`;
    else if (seq === 4) {
      const status = b1;
      const pow = statusStr(status, 2, 'Power');
      const dr = statusStr(status, 1, 'DR');
      const ch = statusStr(status, 0, 'ChMask');
      info += `: Status:0x${status.toString(16)} (${pow}, ${dr}, ${ch}), Bytes Passed:${b0}`;
    }
  } else if (name === 'RXParamSetupReq') {
    if (seq === 1) {
      // Log 1: Byte 1 RX1DRoffset, Byte 0 RX2DataRate
      info += `: RX1DRoffset:${b1}, RX2DataRate:${b0}`;
    } else if (seq === 2) {
      const freqHex = record.substring(2);
      const freqVal = parseInt(freqHex, 16);
      info += `: Freq: 0x${freqHex} (${freqVal} => ${(freqVal / 10000).toFixed(4)} MHz)`; // Assuming 100Hz unit
    } else if (seq === 3) {
      // Log 3: Byte 1 Status Bits (ACK)
      const status = b1;
      const rx2Ack = statusStr(status, 2, 'RX2 DataRate ACK');
      const rx1Ack = statusStr(status, 1, 'RX1 DR offset ACK');
      const chAck = statusStr(status, 0, 'Ch freq ACK');
      info += `: Status:0x${status.toString(16)} (${rx2Ack}, ${rx1Ack}, ${chAck}), Passed:${b0}`;
    }
  } else if (name === 'NewChannelReq') {
    if (seq === 1) {
      // Log 1: Byte 1 ChIndex, Byte 0 DrRange
      // DrRange: High nibble = Max DR, Low nibble = Min DR ? (Assuming standard)
      info += `: ChIndex:${b1}, DrRange:0x${b0.toString(16)} (Max:${b0 >> 4}, Min:${b0 & 0x0f})`;
    } else if (seq === 2) {
      const freqHex = record.substring(2);
      const freqVal = parseInt(freqHex, 16);
      info += `: Freq: 0x${freqHex} (${freqVal} => ${(freqVal / 10000).toFixed(4)} MHz)`;
    } else if (seq === 3) {
      const status = b1;
      const drAck = statusStr(status, 1, 'DR Range ACK');
      const chAck = statusStr(status, 0, 'Ch Freq ACK');
      info += `: Status:0x${status.toString(16)} (${drAck}, ${chAck}), Passed:${b0}`;
    }
  } else if (name === 'DlChannelReq') {
    if (seq === 1) {
      // Log 1: Byte 1 0, Byte 0 ChIndex
      info += `: ChIndex:${b0}`;
    } else if (seq === 2) {
      const freqHex = record.substring(2);
      const freqVal = parseInt(freqHex, 16);
      info += `: Freq: 0x${freqHex} (${freqVal} => ${(freqVal / 10000).toFixed(4)} MHz)`;
    } else if (seq === 3) {
      // Log 3: Byte 1 Status Bits (ACK)
      const status = b1;
      const upAck = statusStr(status, 1, 'Uplink freq ACK');
      const chAck = statusStr(status, 0, 'Ch freq ACK');
      info += `: Status:0x${status.toString(16)} (${upAck}, ${chAck}), Passed:${b0}`;
    }
  }
  // Singles
  else {
    if (name === 'DutyCycleReq') info += `: MaxDutyCycle: ${b0}`;
    else if (name === 'RXTimingSetupReq') info += `: Delay: ${b1}`;
    else if (name === 'TxParamSetupReq') info += `: EIRP/Dwell: 0x${b1.toString(16)}`;
    else info += `: Data: ${record.substring(4)}`;
  }

  // b2 is read but only used to keep destructuring parity with the original; some
  // branches above intentionally don't reference it, matching the source file.
  void b2;

  return info;
}
