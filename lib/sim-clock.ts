import { useSyncExternalStore } from 'react';

// Simulation time, separate from wall time so it can be warped. The Sun,
// Moon and day/night line follow it; the Nano feed always stays real-time.

let baseSim = Date.now();
let baseReal = typeof performance !== 'undefined' ? performance.now() : 0;
let warp = 1;
const listeners = new Set<() => void>();
let snapshot = { warp, live: true };

function rebase() {
  const now = performance.now();
  baseSim = simNowMs(now);
  baseReal = now;
}

/** Simulation time in ms since the Unix epoch. */
export function simNowMs(realNow = performance.now()): number {
  return baseSim + (realNow - baseReal) * warp;
}

export const simNow = () => new Date(simNowMs());

function publish() {
  snapshot = { warp, live: warp === 1 && Math.abs(simNowMs() - Date.now()) < 2000 };
  listeners.forEach((l) => l());
}

export function setWarp(next: number) {
  rebase();
  warp = next;
  publish();
}

/** Jump the simulation to a given moment (keeps the current warp). */
export function setSimTime(ms: number) {
  baseSim = ms;
  baseReal = performance.now();
  publish();
}

/** Back to real time, 1×. */
export function resetClock() {
  baseSim = Date.now();
  baseReal = performance.now();
  warp = 1;
  publish();
}

export function useClockState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => snapshot
  );
}

// Development only: __xno.clock.setSimTime(ms) / setWarp(x) / resetClock(), for the video recorder.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const w = window as unknown as { __xno?: Record<string, unknown> };
  w.__xno = { ...(w.__xno ?? {}), clock: { setSimTime, setWarp, resetClock } };
}
