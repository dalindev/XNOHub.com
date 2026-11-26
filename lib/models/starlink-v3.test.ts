import { describe, expect, it } from 'vitest';
import { wingPose, BUS, PANEL_M, PANELS_PER_WING } from '@/lib/models/starlink-v3';

describe('Starlink V3 array unfolding', () => {
  it('starts as a flat stack lying on its half of the bus, low enough for the payload slot', () => {
    const { panels } = wingPose(0);
    for (const p of panels) {
      expect(p.x - PANEL_M / 2).toBeGreaterThanOrEqual(-0.01);
      expect(p.x + PANEL_M / 2).toBeLessThanOrEqual(BUS.x / 2 + 0.01);
      expect(p.y).toBeGreaterThan(BUS.y / 2);
      expect(Math.abs(Math.sin(p.angle))).toBeLessThan(1e-6); // lying flat
    }
    const top = Math.max(...panels.map((p) => p.y));
    expect(top + BUS.y / 2).toBeLessThan(0.62); // bus and stack fit Starship's 0.62 m slot
  });

  it('ends as one flat array in a line out from the bus, no panel overlapping the next', () => {
    const { panels, hinge } = wingPose(1);
    expect(panels).toHaveLength(PANELS_PER_WING);
    panels.forEach((p, k) => {
      expect(p.angle).toBeCloseTo(0, 6);
      expect(p.y).toBeCloseTo(BUS.y / 2, 6);
      expect(p.x).toBeCloseTo(hinge.x + (k + 0.5) * PANEL_M, 3);
    });
    expect(hinge.x).toBeGreaterThan(BUS.x / 2 + 1);
  });

  it('only ever moves outward as it opens', () => {
    let last = -Infinity;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const reach = Math.max(...wingPose(p).panels.map((q) => q.x));
      expect(reach).toBeGreaterThanOrEqual(last - 1e-6);
      last = reach;
    }
  });
});
