import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createMissionState,
  baseClearanceM,
  boosterEngineLit,
  boosterGas,
  BOOSTBACK_S,
  MECO_S,
  missionAt,
  satelliteAt,
  newSatellitePose,
  travelled,
  PAD,
  STAGING_S,
  SECO_S,
  BOOSTER_HOME_S,
  LANDING_BURN_S,
  IGNITION_S,
  LAUNCH_FROM_S,
  ENGINE_RINGS,
  formatMet,
  DOOR_OPEN_S,
  FIRST_RELEASE_S,
  RELEASE_EVERY_S,
  DEPLOY_COUNT,
  LAST_RELEASE_S,
  MISSION_END_S,
  SLIDE_S,
  UNFOLD_AFTER_S,
  UNFOLD_S,
  STACK_Z,
  STACK_PITCH,
  STACK_SHOWN,
  SAT_LIFT
} from './starship';
import { latLonToUnit, geocentricLatitude, surfaceRadiusGeocentric, EARTH_RADIUS_KM } from '../geo';

const axis = (q: THREE.Quaternion, x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyQuaternion(q);
const at = (t: number) => missionAt(t, createMissionState());
const SLOT_Y = 33.6, HULL_R = 4.5;
// A folded Starlink V3 seen from above, from its middle (lib/models/starlink-v3):
// the bus corners, and the backhaul dishes' rims on their arms at the corners.
const FOOTPRINT = [
  ...[1, -1].flatMap((x) => [1, -1].map((z) => ({ x: x * 3.1, z: z * 1.5, r: 0 }))),
  ...[1, -1].flatMap((x) => [1, -1].map((z) => ({ x: x * 2.55, z: z * 2.05, r: 0.46 })))
];
/** Farthest and nearest any part of a folded satellite centred at (0, z) gets from the ship's axis. */
const reach = (z: number) => {
  const d = FOOTPRINT.map((p) => Math.hypot(p.x, z + p.z));
  return { far: Math.max(...FOOTPRINT.map((p, i) => d[i] + p.r)), near: Math.min(...FOOTPRINT.map((p, i) => d[i] - p.r)) };
};

describe('Starship mission', () => {
  it('stands on the ground at Starbase (the drawn ellipsoid, not the sphere under it) pointing up', () => {
    const s = at(0);
    const pad = latLonToUnit(PAD.lat, PAD.lon);
    expect(s.ship.pos.clone().normalize().angleTo(pad)).toBeLessThan(1e-6);
    const aboveGroundM = (s.ship.pos.length() - surfaceRadiusGeocentric(geocentricLatitude(PAD.lat))) * EARTH_RADIUS_KM * 1000;
    expect(aboveGroundM).toBeGreaterThan(0);
    expect(aboveGroundM).toBeLessThan(10);
    expect(axis(s.ship.quat, 0, 1, 0).dot(pad)).toBeGreaterThan(0.999);
  });

  it('puts the pad where the map tiles have Starbase: same place on the WGS84 ellipsoid as its geodetic coordinates', () => {
    // ECEF of the geodetic point, turned into the scene frame (x, z, -y) the tiles use.
    const a = 6378.137, b = 6356.752, e2 = 1 - (b * b) / (a * a);
    const phi = THREE.MathUtils.degToRad(PAD.lat), lam = THREE.MathUtils.degToRad(PAD.lon);
    const n = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    const ecef = new THREE.Vector3(n * Math.cos(phi) * Math.cos(lam), n * Math.cos(phi) * Math.sin(lam), n * (1 - e2) * Math.sin(phi));
    const scene = new THREE.Vector3(ecef.x, ecef.z, -ecef.y).divideScalar(EARTH_RADIUS_KM);
    const pad = at(0).booster.pos;
    expect(pad.distanceTo(scene) * EARTH_RADIUS_KM * 1000).toBeLessThan(10); // metres
  });

  it('climbs nearly straight up at first, tipping over gently', () => {
    const tilt = (t: number) => {
      const s = at(t);
      return THREE.MathUtils.radToDeg(axis(s.ship.quat, 0, 1, 0).angleTo(s.ship.pos.clone().normalize()));
    };
    expect(tilt(10)).toBeLessThan(5);
    expect(tilt(30)).toBeLessThan(15);
    expect(tilt(60)).toBeGreaterThan(15);
    expect(tilt(60)).toBeLessThan(35);
  });

  it('hot-stages at T+2:38 about 67 km up at about 5,700 km/h, and reaches orbit at SECO, T+8:57', () => {
    expect(STAGING_S).toBe(158);
    const staging = at(STAGING_S - 1);
    expect(staging.ship.altKm).toBeGreaterThan(60);
    expect(staging.ship.altKm).toBeLessThan(70);
    expect(staging.ship.speed * 3600).toBeGreaterThan(5000);
    expect(staging.ship.speed * 3600).toBeLessThan(6500);
    expect(at(60).ship.altKm).toBeGreaterThan(8);
    expect(at(60).ship.altKm).toBeLessThan(14);
    expect(SECO_S).toBe(537);
    expect(at(SECO_S - 30).ship.flame).toBeGreaterThan(0.9);
    expect(at(SECO_S + 5).ship.flame).toBe(0);
    expect(at(SECO_S + 5).phase).toBe('coast');
  });

  it('keeps the booster light and its engines above the drawn ground on the pad', () => {
    // Its base stands 7 m above the ellipsoid, the drawn ground 1 m: 6 m clear, the engines 3 m.
    expect(baseClearanceM(0)).toBeCloseTo(6, 9);
    expect(baseClearanceM(at(-4).booster.altKm) - 3).toBeGreaterThan(2.9);
    expect(baseClearanceM(1)).toBeCloseTo(1006, 9);
  });

  it('parts the booster from the ship slowly at hot staging, with no jolt', () => {
    const gap = (t: number) => {
      const s = at(t);
      // The ship's path is the stack's base: the booster's base, while they are stacked.
      return s.ship.pos.distanceTo(s.booster.pos) * EARTH_RADIUS_KM * 1000;
    };
    expect(gap(STAGING_S - 1)).toBeLessThan(0.01);
    expect(gap(STAGING_S + 1)).toBeLessThan(5);
    expect(gap(STAGING_S + 3)).toBeLessThan(60);
    expect(gap(STAGING_S + 10)).toBeGreaterThan(100);
    // The booster's speed carries on through staging.
    const before = at(STAGING_S - 0.6).booster.speed, after = at(STAGING_S + 0.1).booster.speed;
    expect(Math.abs(after - before) / before).toBeLessThan(0.03);
  });

  it('pushes the ship straight off the booster along its axis for the first second', () => {
    for (const dt of [0.5, 0.8, 1]) {
      const s = at(STAGING_S + dt);
      const rel = s.booster.pos.clone().sub(s.ship.pos).multiplyScalar(EARTH_RADIUS_KM * 1000);
      const ax = axis(s.ship.quat, 0, 1, 0);
      const behind = -rel.dot(ax);
      // The booster falls back behind the ship, not off to one side of it.
      expect(behind).toBeGreaterThan(0);
      expect(rel.addScaledVector(ax, behind).length()).toBeLessThan(0.02);
    }
    // Later it drifts onto its own path.
    const s = at(STAGING_S + 6);
    const rel = s.booster.pos.clone().sub(s.ship.pos).multiplyScalar(EARTH_RADIUS_KM * 1000);
    const ax = axis(s.ship.quat, 0, 1, 0);
    expect(rel.addScaledVector(ax, -rel.dot(ax)).length()).toBeGreaterThan(5);
  });

  it("keeps the booster's plume on its nozzles while its centre engines burn, through MECO and hot staging", () => {
    for (let t = IGNITION_S; t < BOOSTER_HOME_S + 5; t += 0.05) {
      const centre = Math.min(boosterEngineLit(0, t), boosterEngineLit(1, t), boosterEngineLit(2, t));
      const gas = boosterGas(t);
      if (centre > 0.99) {
        expect(t).toBeGreaterThanOrEqual(gas.on);
        // (An engine takes 0.15 s to go out; the gas leaves as it starts to.)
        expect(t).toBeLessThanOrEqual(gas.off + 0.15);
      }
      // After a second with no engine burning, the gas has left the nozzles.
      const quiet = [0, 0.25, 0.5, 0.75, 1].every((back) => Array.from({ length: 33 }, (_, i) => boosterEngineLit(i, t - back)).every((v) => v < 0.001));
      if (quiet && t > 0) expect(t - gas.off > 0.8 || t - gas.on < 0.01).toBe(true);
    }
    expect(boosterGas(MECO_S + 3).off).toBe(Infinity);
    expect(boosterGas(BOOSTBACK_S[0] - 1).off).toBe(Infinity);
  });

  it('flies level in orbit at orbital speed, the slot side facing away from Earth', () => {
    const s = at(FIRST_RELEASE_S + 5);
    const up = s.ship.pos.clone().normalize();
    expect(s.ship.altKm).toBeCloseTo(200);
    expect(Math.abs(axis(s.ship.quat, 0, 1, 0).dot(up))).toBeLessThan(0.02); // nose horizontal
    expect(axis(s.ship.quat, 0, 0, 1).dot(up)).toBeGreaterThan(0.99); // PEZ slot up
    expect(s.ship.speed).toBeGreaterThan(7.6);
    expect(s.ship.speed).toBeLessThan(8.0);
    expect(s.phase).toBe('deploying');
  });

  it('brings the booster back to the pad by about T+6:45', () => {
    const s = at(BOOSTER_HOME_S - 0.5);
    const pad = latLonToUnit(PAD.lat, PAD.lon);
    expect(s.booster.pos.clone().normalize().angleTo(pad) * EARTH_RADIUS_KM).toBeLessThan(2);
    expect(s.booster.altKm).toBeLessThan(0.2);
    expect(s.booster.speed).toBeLessThan(0.1); // slowed by its landing burn
    expect(at(MISSION_END_S + 1).phase).toBe('done');
  });

  it('lands the booster with a 20 s burn that starts about 2 km up, falling at about 270 m/s', () => {
    const before = at(LANDING_BURN_S - 0.5), after = at(LANDING_BURN_S + 0.25);
    expect(before.booster.altKm).toBeGreaterThan(1.8);
    expect(before.booster.altKm).toBeLessThan(2.4);
    expect(before.booster.speed).toBeGreaterThan(0.22);
    expect(before.booster.speed).toBeLessThan(0.32);
    expect(Math.abs(after.booster.speed - before.booster.speed)).toBeLessThan(0.03); // no jolt as it lights
    expect(BOOSTER_HOME_S - LANDING_BURN_S).toBe(20);
    // Always coming down after its apogee, never back up.
    for (let t = 245; t < BOOSTER_HOME_S; t += 1) expect(at(t + 1).booster.altKm).toBeLessThanOrEqual(at(t).booster.altKm);
    // Fastest high up, then slowed by the air.
    const fastest = Math.max(...Array.from({ length: 140 }, (_, k) => at(242 + k).booster.speed));
    expect(fastest).toBeGreaterThan(0.8);
    expect(fastest).toBeLessThan(1.4);
  });

  it('lights and stops each engine as Flight 10 did', () => {
    const count = (lit: Float32Array) => lit.reduce((n, x) => n + (x > 0.99 ? 1 : 0), 0);
    const any = (lit: Float32Array) => lit.reduce((n, x) => n + (x > 0.01 ? 1 : 0), 0);
    expect(ENGINE_RINGS.booster.reduce((a: number, b) => a + b, 0)).toBe(33);
    expect(LAUNCH_FROM_S).toBeLessThan(IGNITION_S);
    expect(any(at(IGNITION_S - 0.5).booster.lit)).toBe(0);
    // Centre first, outer last, all burning before the stack rises.
    const early = at(IGNITION_S + 0.6).booster.lit;
    expect(count(early.slice(0, 3))).toBe(3);
    expect(any(early.slice(13))).toBe(0);
    expect(count(at(0).booster.lit)).toBe(33);
    expect(at(0).phase).toBe('liftoff');
    expect(at(-1).phase).toBe('ignition');
    expect(at(100).booster.flame).toBe(1);
    // MECO: the centre 3 burn on through staging; 13 for the boost-back; none on the way down.
    const meco = at(157).booster.lit;
    expect(count(meco)).toBe(3);
    expect(count(meco.slice(0, 3))).toBe(3);
    expect(count(at(170).booster.lit)).toBe(13);
    expect(any(at(230).booster.lit)).toBe(0);
    // Landing: all 13, then the centre 3, then out once it is home.
    expect(count(at(LANDING_BURN_S + 1).booster.lit)).toBe(13);
    expect(count(at(BOOSTER_HOME_S - 6).booster.lit)).toBe(3);
    expect(any(at(BOOSTER_HOME_S + 1).booster.lit)).toBe(0);
    // The ship: nothing until staging, all six to SECO.
    expect(any(at(150).ship.lit)).toBe(0);
    expect(count(at(300).ship.lit)).toBe(6);
    expect(any(at(SECO_S + 1).ship.lit)).toBe(0);
  });

  it('shows mission time as a launch clock does', () => {
    expect(formatMet(-4.3)).toBe('T\u22120:05');
    expect(formatMet(-0.2)).toBe('T\u22120:01');
    expect(formatMet(0)).toBe('T+0:00');
    expect(formatMet(65.7)).toBe('T+1:05');
    expect(formatMet(SECO_S)).toBe('T+8:57');
  });

  it('opens the door at T+18:27 and lets one satellite out every 53 s', () => {
    expect(at(DOOR_OPEN_S - 1).door).toBe(0);
    expect(at(FIRST_RELEASE_S).door).toBe(1);
    expect(at(FIRST_RELEASE_S - 1).deployed).toBe(0);
    expect(at(FIRST_RELEASE_S + RELEASE_EVERY_S * 10 + 1).deployed).toBe(11);
    expect(at(LAST_RELEASE_S + 1).deployed).toBe(DEPLOY_COUNT);
    expect(at(MISSION_END_S - 1).door).toBe(0);
  });

  it('sends each satellite straight out of the slot, in line, evenly spaced and without turning', () => {
    const p = newSatellitePose();
    const t = LAST_RELEASE_S + 10;
    let last = Infinity;
    for (let k = 0; k < DEPLOY_COUNT; k++) {
      const s = satelliteAt(k, t, SLOT_Y, p);
      expect(s.visible).toBe(true);
      // No sideways or fore-and-aft drift: it keeps the ship's speed.
      expect(s.pos.x).toBe(0);
      expect(s.pos.y).toBe(SLOT_Y + SAT_LIFT);
      expect(s.quat.angleTo(new THREE.Quaternion())).toBe(0);
      if (k > 0 && k < DEPLOY_COUNT - 1) expect(last - s.pos.z).toBeCloseTo(0.3 * RELEASE_EVERY_S, 6);
      last = s.pos.z;
    }
    // Wholly inside the hull when its turn comes; wholly clear of it 40 s later.
    expect(reach(satelliteAt(0, FIRST_RELEASE_S, SLOT_Y, p).pos.z).far).toBeLessThan(HULL_R);
    expect(reach(satelliteAt(0, FIRST_RELEASE_S + 40, SLOT_Y, p).pos.z).near).toBeGreaterThan(HULL_R + 0.3);
    // Never back toward the ship.
    for (let a = 0; a < 600; a += 5) expect(travelled(a + 5)).toBeGreaterThan(travelled(a));
  });

  it('keeps the waiting satellites in a stack that lowers one step after each has gone', () => {
    const p = newSatellitePose();
    const levelOf = (k: number, t: number) => (satelliteAt(k, t, SLOT_Y, p).pos.y - SLOT_Y - SAT_LIFT) / STACK_PITCH;
    // Before the first release: the first at the slot, the next few above it, the rest out of sight.
    for (let k = 0; k <= STACK_SHOWN; k++) {
      expect(satelliteAt(k, DOOR_OPEN_S, SLOT_Y, p).visible).toBe(true);
      expect(levelOf(k, DOOR_OPEN_S)).toBeCloseTo(k, 9);
      expect(p.pos.z).toBe(STACK_Z);
    }
    expect(satelliteAt(STACK_SHOWN + 1, DOOR_OPEN_S, SLOT_Y, p).visible).toBe(false);
    for (let k = 1; k < DEPLOY_COUNT; k++) {
      const release = FIRST_RELEASE_S + k * RELEASE_EVERY_S;
      // At the slot's height when its turn comes, one step up until the one before is clear.
      expect(levelOf(k, release)).toBeCloseTo(0, 9);
      const before = release - RELEASE_EVERY_S;
      expect(levelOf(k, before + 30)).toBeCloseTo(1, 9);
      const behind = satelliteAt(k - 1, before + 34, SLOT_Y, p).pos.z - 2.51; // its back dishes
      expect(behind).toBeGreaterThan(STACK_Z + 2.51); // past the stack's front
    }
  });

  it('opens each satellite’s arrays only long after release, slowly, far from the ship', () => {
    const p = newSatellitePose();
    const t0 = FIRST_RELEASE_S + 7 * RELEASE_EVERY_S;
    expect(satelliteAt(7, t0 + UNFOLD_AFTER_S - 1, SLOT_Y, p).unfold).toBe(0);
    const mid = satelliteAt(7, t0 + UNFOLD_AFTER_S + UNFOLD_S / 2, SLOT_Y, p).unfold;
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
    expect(UNFOLD_S).toBeGreaterThanOrEqual(120);
    expect(satelliteAt(DEPLOY_COUNT - 1, MISSION_END_S - 1, SLOT_Y, p).unfold).toBe(1);
    // Far from the ship when it starts, with the neighbours 3 m-deep satellites well apart.
    expect(satelliteAt(7, t0 + UNFOLD_AFTER_S, SLOT_Y, p).pos.z).toBeGreaterThan(60);
    expect(0.3 * RELEASE_EVERY_S).toBeGreaterThan(3 * 4);
  });
});
