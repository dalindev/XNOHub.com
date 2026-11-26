import * as THREE from 'three';
import { ellipsoidNormal } from '@/lib/geo';
import { describe, expect, it } from 'vitest';
import { chaseFrame, newChaseFrame, CHASE_START } from './starship-chase';
import { placeOrbitCamera } from '@/components/use-orbit-view';
import { sceneToEnu, siteFrame } from '@/lib/sites/frame';
import { GROUND_M, ORIGIN, TOWER2 } from '@/lib/sites/starbase';
import { createMissionState, DOOR_OPEN_S, LAUNCH_FROM_S, missionAt, STAGING_S } from './starship';
import { BOOSTER_HEIGHT_M } from '@/lib/models/starship-models';
import { METRE } from '@/lib/chase-camera';

/** The ship's root as the scene places it: a booster's height up the stack's axis while stacked. */
const shipRoot = (t: number) => {
  const s = missionAt(t, createMissionState());
  const pos = s.ship.pos.clone().add(new THREE.Vector3(0, BOOSTER_HEIGHT_M * METRE, 0).applyQuaternion(s.ship.quat));
  return { s, pos, quat: s.ship.quat };
};

describe('the chase camera’s framing', () => {
  it('works out up from the ship itself, so the first frame of a launch is framed right', () => {
    const { s, pos, quat } = shipRoot(LAUNCH_FROM_S);
    // A fresh frame, as on the first launch since the page loaded.
    const c = chaseFrame(LAUNCH_FROM_S, pos, quat, newChaseFrame());
    expect(c.up.length()).toBeCloseTo(1, 6);
    expect(c.up.dot(ellipsoidNormal(pos))).toBeCloseTo(1, 9);
    expect(c.fwd.length()).toBeCloseTo(1, 6);
    expect(Math.abs(c.fwd.dot(c.up))).toBeLessThan(1e-6);
    // Looking at the stack: 10 m below the ship's base, about 62 m above the booster's.
    const height = c.centre.clone().sub(s.ship.pos).dot(c.up) / METRE;
    expect(height).toBeGreaterThan(55);
    expect(height).toBeLessThan(70);
    expect(c.distM).toBe(330);
  });

  it('starts where Tower 2 doesn’t hide the stack', () => {
    const { pos, quat } = shipRoot(-4);
    const c = chaseFrame(-4, pos, quat, newChaseFrame());
    const cam = new THREE.PerspectiveCamera();
    placeOrbitCamera(cam, c.centre, c.up, c.fwd, c.distM, { ...CHASE_START, held: false });
    // On the ground plan: how close the line from the camera to the stack passes Tower 2's centre.
    const f = siteFrame(ORIGIN.lat, ORIGIN.lon, GROUND_M);
    const a = sceneToEnu(f, cam.position), b = sceneToEnu(f, c.centre);
    const [te, tn] = TOWER2.at;
    const dx = b.x - a.x, dy = b.y - a.y;
    const u = Math.min(1, Math.max(0, ((te - a.x) * dx + (tn - a.y) * dy) / (dx * dx + dy * dy)));
    const miss = Math.hypot(a.x + u * dx - te, a.y + u * dy - tn);
    expect(miss).toBeGreaterThan(15); // the lattice is 8.3 m from its centre to a corner
  });

  it('keeps its heading through liftoff: no swing round the stack as it starts to tip', () => {
    const frame = newChaseFrame();
    let prev: THREE.Vector3 | null = null;
    for (let t = LAUNCH_FROM_S; t <= 5; t += 1 / 60) {
      const { pos, quat } = shipRoot(t);
      const fwd = chaseFrame(t, pos, quat, frame).fwd.clone();
      if (prev) expect(THREE.MathUtils.radToDeg(prev.angleTo(fwd))).toBeLessThan(1);
      prev = fwd;
    }
  });

  it('frames the ship after staging, and the slot while it lets the satellites out', () => {
    const after = shipRoot(STAGING_S + 60);
    expect(chaseFrame(STAGING_S + 60, after.pos, after.quat, newChaseFrame()).distM).toBe(220);
    const releasing = shipRoot(DOOR_OPEN_S);
    const c = chaseFrame(DOOR_OPEN_S, releasing.pos, releasing.quat, newChaseFrame());
    expect(c.releasing).toBe(true);
    expect(c.distM).toBe(170);
  });
});
