// "This node just sent or received something": the packet layer schedules a
// pulse, the node layer draws it as an expanding ring. Times are seconds on
// the packet clock (performance.now() / 1000), and may be in the future (a
// packet's arrival time is known when it leaves).

export interface Pulse {
  /** Index into the drawn nodes (reps with a known location, in file order). */
  node: number;
  at: number;
  r: number;
  g: number;
  b: number;
}

const pending: Pulse[] = [];
const MAX_PENDING = 4000;

export const packetClock = () => performance.now() / 1000;

export function pulseNode(node: number, at: number, color: { r: number; g: number; b: number }) {
  if (pending.length >= MAX_PENDING) return;
  pending.push({ node, at, r: color.r, g: color.g, b: color.b });
}

/** Hands every pulse that is due to `apply` and forgets it. */
export function takeDuePulses(now: number, apply: (p: Pulse) => void) {
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].at > now) continue;
    apply(pending[i]);
    pending[i] = pending[pending.length - 1];
    pending.pop();
  }
}

/** For tests. */
export const pendingPulses = () => pending.length;
