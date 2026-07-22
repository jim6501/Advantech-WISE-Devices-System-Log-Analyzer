// Ported 1:1 from ../../../ui/sessions.js `detectSeries`.
import type { ProductSeries, RawLogEntry } from '../../types';

export function detectSeries(rawLogs: RawLogEntry[]): ProductSeries {
  if (!rawLogs.length || !rawLogs[0].UID) return 'wifi';
  const uid = String(rawLogs[0].UID).toUpperCase();

  if (uid.includes('WISE-4610') || uid.includes('WISE-2200') || uid.includes('WISE-2410')) {
    return 'lora';
  } else if (uid.includes('WISE-4671') || uid.includes('WISE-4471')) {
    return 'nbiot';
  } else if (uid.includes('WISE-4000/LAN')) {
    return 'lan';
  } else if (uid.includes('WISE-40') || uid.includes('WISE-42')) {
    return 'wifi';
  }
  return 'wifi';
}
