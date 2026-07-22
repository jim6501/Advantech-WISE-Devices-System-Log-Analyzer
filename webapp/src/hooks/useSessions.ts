import { useCallback, useReducer } from 'react';
import type { ProductSeries, RawLogEntry, Session } from '../types';
import { detectSeries } from '../lib/parser/detectSeries';
import { normalizeLog } from '../lib/normalizeLog';

interface State {
  sessions: Session[];
  activeId: number | null;
  nextId: number;
}

type Action =
  | { type: 'add'; fileName: string; rawLogs: RawLogEntry[] }
  | { type: 'remove'; id: number }
  | { type: 'setActive'; id: number }
  | { type: 'reparseActive'; series: ProductSeries }
  | { type: 'clearAll' };

const initialState: State = { sessions: [], activeId: null, nextId: 1 };

function buildSession(id: number, fileName: string, rawLogs: RawLogEntry[]): Session {
  const series = detectSeries(rawLogs);
  const { events, metadata } = normalizeLog(rawLogs, series);
  return { id, fileName, series, rawLogs, events, metadata };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const session = buildSession(state.nextId, action.fileName, action.rawLogs);
      return { sessions: [...state.sessions, session], activeId: session.id, nextId: state.nextId + 1 };
    }
    case 'remove': {
      const idx = state.sessions.findIndex((s) => s.id === action.id);
      if (idx === -1) return state;
      const sessions = state.sessions.filter((s) => s.id !== action.id);
      let activeId = state.activeId;
      if (state.activeId === action.id) {
        activeId = sessions.length ? sessions[Math.min(idx, sessions.length - 1)].id : null;
      }
      return { ...state, sessions, activeId };
    }
    case 'setActive': {
      if (!state.sessions.some((s) => s.id === action.id)) return state;
      return { ...state, activeId: action.id };
    }
    case 'reparseActive': {
      if (state.activeId === null) return state;
      const sessions = state.sessions.map((s) => {
        if (s.id !== state.activeId) return s;
        const { events, metadata } = normalizeLog(s.rawLogs, action.series);
        return { ...s, series: action.series, events, metadata };
      });
      return { ...state, sessions };
    }
    case 'clearAll':
      return initialState;
    default:
      return state;
  }
}

export function useSessions() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const add = useCallback((fileName: string, rawLogs: RawLogEntry[]) => dispatch({ type: 'add', fileName, rawLogs }), []);
  const remove = useCallback((id: number) => dispatch({ type: 'remove', id }), []);
  const setActive = useCallback((id: number) => dispatch({ type: 'setActive', id }), []);
  const reparseActive = useCallback((series: ProductSeries) => dispatch({ type: 'reparseActive', series }), []);
  const clearAll = useCallback(() => dispatch({ type: 'clearAll' }), []);

  const activeSession = state.sessions.find((s) => s.id === state.activeId) ?? null;

  return {
    sessions: state.sessions,
    activeSession,
    add,
    remove,
    setActive,
    reparseActive,
    clearAll,
  };
}
