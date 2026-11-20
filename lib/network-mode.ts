import { useSyncExternalStore } from 'react';

// How confirmations are drawn, plus the latest route timings for the
// dashboard. A tiny external store: the 3D layers read it directly each frame,
// React panels subscribe.

export type NetMode = 'classic' | 'cables' | 'starlink' | 'race';

export interface RaceStats {
  /** Receivers in the last confirmation that had both kinds of route. */
  targets: number;
  fibreAvgMs: number;
  fibreMaxMs: number;
  spaceAvgMs: number;
  spaceMaxMs: number;
  /** Share of receivers Starlink reached first, last confirmation. */
  spaceWinShare: number;
  /** Running totals since page load. */
  races: number;
  spaceWins: number;
  lastCables: string[];
}

interface State {
  mode: NetMode;
  /** Animation runs this many times slower than real propagation. */
  slowMo: number;
  showCables: boolean;
  showLasers: boolean;
  stats: RaceStats | null;
}

let state: State = { mode: 'race', slowMo: 50, showCables: true, showLasers: true, stats: null };
const listeners = new Set<() => void>();

export const netMode = {
  get: () => state,
  set(patch: Partial<State>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  }
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useNetMode(): State {
  return useSyncExternalStore(subscribe, netMode.get, netMode.get);
}
