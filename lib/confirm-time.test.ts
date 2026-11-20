import { describe, expect, it } from 'vitest';
import { confirmTime, voteWorkMs, VOTE_WORK_MS } from './confirm-time';

describe('confirmTime', () => {
  it('is confirmed when the vote that crosses two-thirds is back: out, work, back', () => {
    const trips = [
      { travelMs: 10, workMs: 100, share: 30 }, // back at 120
      { travelMs: 40, workMs: 100, share: 30 }, // back at 180: 10 + 30 + 30 = 70 >= 67
      { travelMs: 90, workMs: 100, share: 30 }
    ];
    expect(confirmTime(10, trips)).toEqual({ totalMs: 180, travelMs: 80 });
  });

  it('orders votes by when they are back, not by distance', () => {
    const trips = [
      { travelMs: 10, workMs: 300, share: 40 }, // near but slow: back at 320
      { travelMs: 50, workMs: 100, share: 40 }, // far but quick: back at 200
      { travelMs: 60, workMs: 100, share: 40 } // back at 220: 40 + 40 = 80
    ];
    expect(confirmTime(0, trips)).toEqual({ totalMs: 220, travelMs: 120 });
  });

  it('needs no trip when the sender alone holds a quorum, and is null when votes never add up', () => {
    expect(confirmTime(70, [])).toEqual({ totalMs: 0, travelMs: 0 });
    expect(confirmTime(10, [{ travelMs: 5, workMs: 5, share: 20 }])).toBeNull();
  });
});

describe('voteWorkMs', () => {
  it('stays within 40 ms of the estimate and is the same for a node every time', () => {
    for (let node = 0; node < 500; node++) {
      expect(Math.abs(voteWorkMs(node) - VOTE_WORK_MS)).toBeLessThanOrEqual(40);
      expect(voteWorkMs(node)).toBe(voteWorkMs(node));
    }
  });
});
