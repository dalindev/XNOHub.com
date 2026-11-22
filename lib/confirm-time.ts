// How Nano confirms a block, and how long that takes.
//
// From the Nano docs (protocol design: ORV consensus; node implementation:
// voting; release notes V22):
//   1. The node that has a new block publishes it straight to every principal
//      representative.
//   2. Each representative checks the block and broadcasts a vote to every
//      other representative (not back to the sender alone).
//   3. Once a representative has seen votes carrying 67% of the online voting
//      weight, it broadcasts a second, final vote.
//   4. A node counts the block as confirmed once it has seen final votes
//      carrying 67% of the online weight. Every node tallies for itself: no
//      one node decides for the rest.
//
// What takes time is travel (computed from real routes, at the speed of light
// in fibre or vacuum) and each node's own work: checking the block and signing
// a vote, then signing the final vote. The public feeds don't report that
// work, so it is an estimate, set so that the whole thing takes about the
// 0.3 s Nano typically needs.

/** Percent of the online voting weight that makes a quorum. */
export const QUORUM = 67;
/** Estimated time for a node to check a block and send its first vote, in ms. */
export const VOTE_WORK_MS = 100;
/** Estimated time for a node that has seen a quorum to send its final vote, in ms. */
export const FINAL_VOTE_WORK_MS = 40;

// Nodes differ, so each gets a fixed value within 30% of the estimate.
const spread = (node: number, ms: number) => ms * (0.7 + (((node * 37) % 61) / 60) * 0.6);
export const voteWorkMs = (node: number) => spread(node, VOTE_WORK_MS);
export const finalVoteWorkMs = (node: number) => spread(node + 17, FINAL_VOTE_WORK_MS);

export interface ElectionInput {
  /** Voting nodes; `origin` indexes into every array here. */
  origin: number;
  /** Each node's share of the online voting weight, percent. */
  share: ArrayLike<number>;
  /** One-way travel time between two nodes, ms. Infinity if they can't reach each other. */
  delay: (from: number, to: number) => number;
  voteWork: (node: number) => number;
  finalWork: (node: number) => number;
}

export interface Election {
  /** When the block reaches each node (0 for the origin). */
  blockAt: Float64Array;
  /** When each node sends its first vote. */
  voteSentAt: Float64Array;
  /** When each node has seen a quorum of votes and sends its final vote. Infinity if it never does. */
  finalSentAt: Float64Array;
  /** When each node has seen a quorum of final votes: the block is confirmed there. Infinity if never. */
  confirmedAt: Float64Array;
}

/** When the weight arriving at each node (sent at `sentAt`, a node's own counting at once) adds up to a quorum. */
function quorumAt(n: number, sentAt: Float64Array, share: ArrayLike<number>, delay: ElectionInput['delay']) {
  const out = new Float64Array(n).fill(Infinity);
  const arrivals: [number, number][] = [];
  for (let at = 0; at < n; at++) {
    arrivals.length = 0;
    for (let from = 0; from < n; from++) {
      const t = sentAt[from] + (from === at ? 0 : delay(from, at));
      if (Number.isFinite(t)) arrivals.push([t, share[from]]);
    }
    arrivals.sort((a, b) => a[0] - b[0]);
    let have = 0;
    for (const [t, weight] of arrivals) {
      have += weight;
      if (have >= QUORUM) {
        out[at] = t;
        break;
      }
    }
  }
  return out;
}

/** Plays one block through the two rounds of voting. All times are ms after the origin publishes it. */
export function simulateElection({ origin, share, delay, voteWork, finalWork }: ElectionInput): Election {
  const n = share.length;
  const blockAt = Float64Array.from({ length: n }, (_, i) => (i === origin ? 0 : delay(origin, i)));
  const voteSentAt = blockAt.map((t, i) => t + voteWork(i));
  const finalSentAt = quorumAt(n, voteSentAt, share, delay).map((t, i) => t + finalWork(i));
  const confirmedAt = quorumAt(n, finalSentAt, share, delay);
  return { blockAt, voteSentAt, finalSentAt, confirmedAt };
}

/**
 * A node that doesn't vote. Nothing is sent to it to say "confirmed": like every node it receives
 * the representatives' final votes and counts them itself. This is when those add up to a quorum
 * at a node `delayTo(rep)` ms from each representative, and which representative's vote completed
 * it. (Final votes reach most non-voting nodes straight from the representatives; some get them
 * one relay later, which is not modelled.) Null if they never add up.
 */
export function hearFinalVotes(election: Election, share: ArrayLike<number>, delayTo: (rep: number) => number): { at: number; from: number } | null {
  const arrivals: [number, number][] = [];
  for (let rep = 0; rep < share.length; rep++) {
    const t = election.finalSentAt[rep] + delayTo(rep);
    if (Number.isFinite(t)) arrivals.push([t, rep]);
  }
  arrivals.sort((a, b) => a[0] - b[0]);
  let have = 0;
  for (const [t, rep] of arrivals) {
    have += share[rep];
    if (have >= QUORUM) return { at: t, from: rep };
  }
  return null;
}
