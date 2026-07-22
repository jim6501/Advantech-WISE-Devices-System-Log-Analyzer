// Ported 1:1 from ../../../parser.js `utils` — do not change the logic, only types.

export function hexToAscii(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

export function parseIp(hex: string): string {
  // Example: C0A80101 -> 192.168.1.1
  const p1 = parseInt(hex.substring(0, 2), 16);
  const p2 = parseInt(hex.substring(2, 4), 16);
  const p3 = parseInt(hex.substring(4, 6), 16);
  const p4 = parseInt(hex.substring(6, 8), 16);
  return `${p1}.${p2}.${p3}.${p4}`;
}

export function parseMac(hex: string): string {
  // Example: 00D0C9CC0001 -> 00:D0:C9:CC:00:01
  return (hex.match(/.{1,2}/g) ?? []).join(':');
}

export function hexToBinary(hex: string): string {
  return parseInt(hex, 16).toString(2).padStart(hex.length * 4, '0');
}

export function checkBit(val: number, bit: number): boolean {
  return (val & (1 << bit)) !== 0;
}

// Normalizes a log's TIM field to an ISO 8601 string. Most exports already
// use ISO strings, but some LoRaWAN exports use raw Unix epoch seconds
// (e.g. "1749104460") instead.
export function normalizeTimestamp(raw: string | number | null | undefined): string | number | null | undefined {
  if (raw === null || raw === undefined || raw === '') return raw;
  const str = String(raw).trim();

  if (/^\d+$/.test(str)) {
    const date = new Date(Number(str) * 1000);
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  return raw;
}
