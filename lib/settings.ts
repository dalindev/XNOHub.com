import { useSyncExternalStore } from 'react';

// What the viewer has switched on. A tiny external store: the 3D layers read
// it directly inside useFrame (no re-renders), the dashboard subscribes.

/** How each confirmation is drawn. */
export type SignalMode = 'cables' | 'starlink' | 'race' | 'classic';

export interface Settings {
  mode: SignalMode;
  /** Packets are drawn this many times slower than real propagation. */
  slowMo: number;
  cables: boolean;
  lasers: boolean;
  /** How solid the cloud layer is drawn: 0 hides it, 1 is as thick as the satellite photo shows. */
  clouds: number;
  aurora: boolean;
  skyLabels: boolean;
}

let state: Settings = {
  mode: 'race', // fibre (how nodes really talk) and Starlink (the what-if) side by side
  slowMo: 1, // real time: a confirmation is over in about a third of a second, as on the real network
  cables: true,
  lasers: false,
  clouds: 0.5, // see-through by default, so the land and the network stay readable
  aurora: true,
  skyLabels: true
};
const listeners = new Set<() => void>();

export const settings = {
  get: () => state,
  set(patch: Partial<Settings>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  }
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, settings.get, settings.get);
}
