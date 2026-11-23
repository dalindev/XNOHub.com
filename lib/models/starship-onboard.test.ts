import { describe, expect, it } from 'vitest';
import { LAMP_OUT_M, buildPayloadBay } from '@/lib/models/starship-onboard';

describe('the payload bay', () => {
  it('lights the bay from in front of its lamps, not against the wall they hang on', () => {
    const bay = buildPayloadBay();
    expect(bay.lamps).toHaveLength(2);
    // The fixtures sit 4.293 m out from the axis, 0.137 m in front of the wall
    // (4.43 m there); the light comes from LAMP_OUT_M further in.
    const FIXTURE_R = Math.hypot(1.1, 4.15), WALL_R = FIXTURE_R + 0.137;
    for (const l of bay.lamps) expect(FIXTURE_R - Math.hypot(l.x, l.z)).toBeCloseTo(LAMP_OUT_M, 6);
    // So the wall right by a lamp gets about twice the Sun's light, not a hundred times.
    const BAY_LAMP = 4, SUN = 2;
    for (const l of bay.lamps) expect(BAY_LAMP / (WALL_R - Math.hypot(l.x, l.z)) ** 2 / SUN).toBeLessThan(2.5);
  });
});
