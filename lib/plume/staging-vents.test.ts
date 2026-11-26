import { describe, expect, it } from 'vitest';
import { ventAngles, ventState, VENT_PITCH_M, VENT_Y, type VentState } from './staging-vents';
import { textureSize } from '@/lib/models/vehicle-materials';
import { BOOSTER_HEIGHT_M, HOT_STAGE_RING_Y, R } from '@/lib/models/starship-models';

const s = (): VentState => ({ vents: 0, sheet: 0, warm: 0 });

describe('hot-staging vents', () => {
  it('puts a jet in the middle of each of the ring texture’s whole openings', () => {
    expect(VENT_PITCH_M).toBe(textureSize('vents')[0]);
    expect(textureSize('vents')[1]).toBeCloseTo(BOOSTER_HEIGHT_M - HOT_STAGE_RING_Y, 6);
    expect(VENT_Y).toBeCloseTo((HOT_STAGE_RING_Y + BOOSTER_HEIGHT_M) / 2, 6);
    const a = ventAngles();
    expect(a.length).toBe(23); // 28.3 m round, an opening every 1.2 m
    expect(a[0] * R).toBeCloseTo(VENT_PITCH_M / 2, 6);
    for (let k = 1; k < a.length; k++) expect((a[k] - a[k - 1]) * R).toBeCloseTo(VENT_PITCH_M, 6);
    // The last one ends before the texture's seam (the part-opening there gets none).
    expect((a[a.length - 1] * R) + VENT_PITCH_M / 2).toBeLessThanOrEqual(2 * Math.PI * R);
  });

  it('blasts out of the vents while the ship sits on the ring, then off the dome as it pulls away', () => {
    expect(ventState(-0.1, 1, 0, 1, s())).toMatchObject({ vents: 0, sheet: 0 });
    const stacked = ventState(0.6, 1, 0.05, 1, s());
    expect(stacked.vents).toBeCloseTo(1, 3);
    expect(stacked.sheet).toBeCloseTo(0, 3);
    const off = ventState(1.5, 1, 3, 1, s());
    expect(off.vents).toBeCloseTo(0, 3);
    expect(off.sheet).toBeGreaterThan(0.85);
    // Less of the plume hits the dome the further off the ship is.
    expect(ventState(2, 1, 10, 1, s()).sheet).toBeLessThan(off.sheet);
    expect(ventState(3, 1, 33, 1, s()).sheet).toBeLessThan(0.1);
  });

  it('follows the ship’s engines, and stops once the booster has turned away', () => {
    expect(ventState(0.2, 0.2, 0, 1, s()).vents).toBeCloseTo(0.2, 3);
    expect(ventState(3, 1, 5, 0.5, s())).toMatchObject({ vents: 0, sheet: 0 });
  });

  it('is orange at first, then white', () => {
    expect(ventState(0.1, 1, 0, 1, s()).warm).toBe(1);
    expect(ventState(2, 1, 5, 1, s()).warm).toBe(0);
  });
});
