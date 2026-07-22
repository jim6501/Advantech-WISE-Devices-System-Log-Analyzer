// Ported 1:1 from ../../../ui/sessions.js `detectSeries`.
import type { ProductSeries, RawLogEntry } from '../../types';

export function detectSeries(rawLogs: RawLogEntry[]): ProductSeries {
  if (!rawLogs.length || !rawLogs[0].UID) return 'wifi';
  // Real UIDs come without the hyphen after "WISE" (e.g. "wise2410-9639"), so
  // strip all hyphens before matching against model numbers.
  const uid = String(rawLogs[0].UID).toUpperCase().replace(/-/g, '');

  if (uid.includes('WISE4610') || uid.includes('WISE2200') || uid.includes('WISE2410')) {
    return 'lora';
  } else if (uid.includes('WISE4671') || uid.includes('WISE4471')) {
    return 'nbiot';
  } else if (uid.includes('WISE4000/LAN') || uid.includes('WISE4000LAN')) {
    return 'lan';
  } else if (uid.includes('WISE40') || uid.includes('WISE42')) {
    return 'wifi';
  }
  return 'wifi';
}
