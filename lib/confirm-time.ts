// When a block counts as confirmed, and how long that takes.
//
// Nano confirms a block once votes carrying two-thirds of the online voting
// weight have come back. Two things take time:
//   - travel: the block out to each node and its vote back, at the speed of
//     light in fibre or vacuum. This part is computed from real routes.
//   - work: each node checks the block (signature, balance, fork), then signs
//     and sends its vote. The public feed doesn't report this, so it is an
//     estimate: Nano's confirmations typically take about 0.3 s end to end and
//     travel accounts for roughly 0.1 s of that, which leaves about 180 ms.

/** Percent of the online voting weight that confirms a block. */
export const QUORUM = 67;
/** Estimated time for a node to check a block and send its vote, in ms. */
export const VOTE_WORK_MS = 180;
const SPREAD_MS = 40;

/** A node's share of that estimate: nodes differ, so each gets a fixed value within 40 ms of it. */
export const voteWorkMs = (node: number) => VOTE_WORK_MS - SPREAD_MS + ((node * 37) % (2 * SPREAD_MS + 1));

export interface Trip {
  /** One-way travel time to the node, ms. */
  travelMs: number;
  /** Time the node takes before its vote leaves, ms. */
  workMs: number;
  /** The node's share of the online voting weight, percent. */
  share: number;
}

/**
 * Time from sending a block until the votes that are back add up to a quorum,
 * and how much of that was travel. The sender's own vote needs no trip.
 * Null if the votes never add up.
 */
export function confirmTime(ownShare: number, trips: Trip[]): { totalMs: number; travelMs: number } | null {
  let have = ownShare;
  if (have >= QUORUM) return { totalMs: 0, travelMs: 0 };
  const back = (t: Trip) => 2 * t.travelMs + t.workMs;
  for (const t of [...trips].sort((a, b) => back(a) - back(b))) {
    have += t.share;
    if (have >= QUORUM) return { totalMs: back(t), travelMs: 2 * t.travelMs };
  }
  return null;
}
