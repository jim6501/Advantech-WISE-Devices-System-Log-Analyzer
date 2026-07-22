import { useMemo } from 'react';
import type { LogEvent } from '../types';
import { buildPeColorMap } from '../lib/peColors';

// Single source of truth for PE -> color, shared by Legend / Timeline / Table.
export function usePeColorMap(events: LogEvent[]) {
  return useMemo(() => buildPeColorMap(events), [events]);
}
