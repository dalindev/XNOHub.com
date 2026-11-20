import { useSyncExternalStore } from 'react';

// Timings of the latest routed confirmation, for the dashboard. Separate from
// settings so a new confirmation doesn't re-render the controls.

export interface LegStats {
  /** Receivers timed. */
  nodes: number;
  avgMs: number;
  /** Time for the broadcast to reach the farthest node timed. */
  maxMs: number;
  /** Time until votes carrying two-thirds of the online weight are back (out and back), or null if they never add up. */
  quorumMs: number | null;
}

export interface RouteStats {
  fibre: LegStats | null;
  space: LegStats | null;
  /** Nodes the latest broadcast was drawn to, out of the other online nodes. */
  drawn: number;
  online: number;
  /** Receivers that had both routes, and how many Starlink reached first (latest confirmation). */
  pairs: number;
  spaceFirst: number;
  /** Running totals since page load. */
  totalPairs: number;
  totalSpaceFirst: number;
  /** Submarine cables on the longest fibre route drawn. */
  cables: string[];
  /** Satellites relaying the longest Starlink route drawn. */
  hops: number;
}

let stats: RouteStats | null = null;
const listeners = new Set<() => void>();

export const routeStats = {
  get: () => stats,
  set(next: RouteStats) {
    stats = next;
    listeners.forEach((l) => l());
  }
};

export function useRouteStats() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    routeStats.get,
    routeStats.get
  );
}
