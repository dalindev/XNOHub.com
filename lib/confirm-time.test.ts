import { describe, expect, it } from 'vitest';
import { simulateElection, hearFinalVotes, voteWorkMs, finalVoteWorkMs, VOTE_WORK_MS, FINAL_VOTE_WORK_MS } from './confirm-time';

// Four nodes on a line, 10 ms apart: 0 - 1 - 2 - 3.
const line = (from: number, to: number) => Math.abs(from - to) * 10;
const run = (share: number[], origin = 0, delay = line) =>
  simulateElection({ origin, share, delay, voteWork: () => 100, finalWork: () => 40 });

describe('simulateElection', () => {
  it('block out, a vote from each node, then a final vote once a node has seen two-thirds', () => {
    const e = run([25, 25, 25, 25]);
    expect([...e.blockAt]).toEqual([0, 10, 20, 30]);
    expect([...e.voteSentAt]).toEqual([100, 110, 120, 130]);
    // Node 0 needs three votes (75%): its own at 100, node 1's at 120, node 2's at 140. Then 40 ms to send a final vote.
    // Node 2, in the middle, hears nodes 0 and 1 by 120, just as its own vote leaves.
    expect([...e.finalSentAt]).toEqual([180, 170, 160, 170]);
    // Confirmed at node 0 when three final votes are in: its own (180), node 1's (170 + 10), node 2's (160 + 20).
    expect(e.confirmedAt[0]).toBe(180);
  });

  it('every node confirms for itself, at its own time', () => {
    const e = run([25, 25, 25, 25]);
    expect([...e.confirmedAt]).toEqual([180, 190, 180, 190]);
  });

  it('a heavy far node holds everyone up; light near ones cannot confirm alone', () => {
    const e = run([10, 10, 10, 70]);
    // Nobody has two-thirds before node 3's vote (sent at 130) arrives.
    expect(e.finalSentAt[3]).toBe(170);
    expect([...e.finalSentAt]).toEqual([200, 190, 180, 170]);
    expect(e.confirmedAt[0]).toBe(200); // node 3's final vote, 170 + 30
  });

  it('never confirms when the nodes that can be reached hold less than two-thirds', () => {
    const cut = (from: number, to: number) => (from === 3 || to === 3 ? Infinity : line(from, to));
    const e = run([20, 20, 20, 40], 0, cut);
    expect(e.confirmedAt[0]).toBe(Infinity);
    expect(e.finalSentAt[1]).toBe(Infinity);
  });
});

describe('hearFinalVotes', () => {
  it('a node that does not vote confirms when the final votes it hears add up to two-thirds', () => {
    const e = run([25, 25, 25, 25]); // final votes leave at 180, 170, 160, 170
    // A listener 5 ms from node 3, further from the rest: hears 175 (node 3), 185 (node 2), 205 (node 1).
    const heard = hearFinalVotes(e, [25, 25, 25, 25], (rep) => 5 + (3 - rep) * 10);
    expect(heard).toEqual({ at: 195, from: 1 });
  });

  it('is null when it cannot hear enough of the weight', () => {
    const e = run([25, 25, 25, 25]);
    expect(hearFinalVotes(e, [25, 25, 25, 25], (rep) => (rep < 2 ? 10 : Infinity))).toBeNull();
  });
});

describe('work estimates', () => {
  it('stay within 30% of the estimate and are the same for a node every time', () => {
    for (let node = 0; node < 500; node++) {
      expect(Math.abs(voteWorkMs(node) - VOTE_WORK_MS)).toBeLessThanOrEqual(VOTE_WORK_MS * 0.3 + 1e-9);
      expect(Math.abs(finalVoteWorkMs(node) - FINAL_VOTE_WORK_MS)).toBeLessThanOrEqual(FINAL_VOTE_WORK_MS * 0.3 + 1e-9);
      expect(voteWorkMs(node)).toBe(voteWorkMs(node));
    }
  });
});
