import { afterEach, describe, expect, it } from 'vitest';
import { seaLevelAltitude, world } from '@/lib/world';

describe('world', () => {
  const saved = { altitude: world.altitude, ground: world.groundAltitude };
  afterEach(() => {
    world.altitude = saved.altitude;
    world.groundAltitude = saved.ground;
  });

  it('gives the sky model the height above sea level, not above the ground under the camera', () => {
    world.altitude = 0.001;
    world.groundAltitude = 0.0003; // over a plateau
    expect(seaLevelAltitude()).toBeCloseTo(0.0013, 12);
    world.groundAltitude = null; // nothing loaded yet: the ellipsoid
    expect(seaLevelAltitude()).toBe(0.001);
  });
});
