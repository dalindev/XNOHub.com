import { describe, expect, it } from 'vitest';
import { ArcRing, fanOutFraction } from './arc-ring';

describe('ArcRing', () => {
  it('hands out slots in order and wraps oldest-first', () => {
    const r = new ArcRing(3);
    expect([r.claim(), r.claim(), r.claim(), r.claim()]).toEqual([0, 1, 2, 0]);
    expect(r.count).toBe(3);
  });

  it('reports a contiguous dirty range, then clean', () => {
    const r = new ArcRing(10);
    r.claim();
    r.claim();
    expect(r.takeDirty()).toEqual([0, 2]);
    expect(r.takeDirty()).toBeNull();
    r.claim();
    expect(r.takeDirty()).toEqual([2, 1]);
  });

  it('uploads everything when a frame wraps past the end', () => {
    const r = new ArcRing(4);
    r.claim();
    r.claim();
    r.claim();
    r.takeDirty();
    r.claim(); // slot 3
    r.claim(); // slot 0, wraps
    expect(r.takeDirty()).toEqual([0, 4]);
  });
});

describe('fanOutFraction', () => {
  it('fans out to every node at today’s traffic and shrinks under load', () => {
    expect(fanOutFraction(0.3)).toBe(1);
    expect(fanOutFraction(2.5)).toBeCloseTo(0.2);
    expect(fanOutFraction(20)).toBe(0.01);
    expect(fanOutFraction(10)).toBeGreaterThan(0.01);
    expect(fanOutFraction(10)).toBeLessThan(0.2);
  });
});
