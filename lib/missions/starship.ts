import * as THREE from 'three';
import { latLonToUnit, surfaceRadiusGeocentric, EARTH_RADIUS_KM } from '@/lib/geo';

// A Starship Starlink mission as a function of mission elapsed time (MET,
// real seconds after liftoff): ascent from Starbase, hot staging, the booster
// flying home, the ship to orbit, a coast, then 60 Starlink V3 satellites let
// out of the payload slot one at a time. The viewer picks how fast the clock
// runs (components/starship-mission); every event here is on the real clock.
//
// Times follow Starship Flight 10 (26 Aug 2025), the first flight to let
// satellites out: hot staging at T+2:38, boost-back from T+2:48, engine cutoff
// (SECO) at about T+8:40, payload door opening at T+18:27, then 8 Starlink
// mass simulators, one about every 53 s (all out by T+25:32). A real V3
// mission would carry about 60, so here the same pace runs on for 60.
//
// In space nothing slows a satellite down: once the dispenser has pushed it
// out it keeps the ship's speed plus a small push straight out of the slot,
// so seen from the ship the satellites rise in a straight, evenly spaced line
// without turning, and each opens its arrays only once it is well clear.
// (Over hours orbital mechanics would curve the line; over this hour it is
// within a few metres of straight.)

export const PAD = { lat: 25.997, lon: -97.157 }; // Starbase, Texas

export const STAGING_S = 158; // T+2:38 hot staging
const BOOSTBACK_S = [168, 215]; // T+2:48 boost-back burn
const BOOSTER_APOGEE_S = 240;
const LANDING_BURN_S = 380;
export const BOOSTER_HOME_S = 405; // T+6:45 back at the pad
export const SECO_S = 520; // T+8:40 ship engine cutoff, in orbit
export const DOOR_OPEN_S = 1107; // T+18:27
export const FIRST_RELEASE_S = 1140; // T+19:00
export const RELEASE_EVERY_S = 53;
export const DEPLOY_COUNT = 60;
export const LAST_RELEASE_S = FIRST_RELEASE_S + RELEASE_EVERY_S * (DEPLOY_COUNT - 1);

// Each satellite: pushed out of the slot over SLIDE_S, then drifting straight
// out at SEPARATION_MS; arrays open after UNFOLD_AFTER_S, over UNFOLD_S.
export const SLIDE_S = 24;
export const SEPARATION_MS = 0.3;
export const UNFOLD_AFTER_S = 300;
export const UNFOLD_S = 240;
export const MISSION_END_S = LAST_RELEASE_S + UNFOLD_AFTER_S + UNFOLD_S + 60;

const STAGING_ALT_KM = 67;
const STAGING_DOWNRANGE_KM = 68;
export const ORBIT_ALT_KM = 200;
export const ORBIT_KMS = 7.8; // orbital speed at that height
// The path is laid out along the ground: the point under the ship moves slower.
const GROUND_KMS = (ORBIT_KMS * EARTH_RADIUS_KM) / (EARTH_RADIUS_KM + ORBIT_ALT_KM);

export type Phase = 'liftoff' | 'ascent' | 'hot staging' | 'ship burn' | 'coast' | 'deploying' | 'unfolding' | 'done';

export interface Body {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  altKm: number;
  /** km/s */
  speed: number;
  visible: boolean;
  flame: number; // 0..1 engine plume
}

export interface MissionState {
  phase: Phase;
  ship: Body;
  booster: Body;
  /** Satellites out of the slot so far. */
  deployed: number;
  /** Satellites with their arrays fully open. */
  unfolded: number;
  /** 0 closed .. 1 open */
  door: number;
}

// The pad's direction from the Earth's centre (its latitude is the map's, geodetic).
const U = latLonToUnit(PAD.lat, PAD.lon);
/** The booster's engines clear the ground by this much on the pad (km). */
const ON_PAD_KM = 0.004;
// East at the pad: derivative of latLonToUnit with respect to longitude.
const E = new THREE.Vector3(-Math.sin(PAD.lon * (Math.PI / 180)), 0, -Math.cos(PAD.lon * (Math.PI / 180))).normalize();
const N = new THREE.Vector3().crossVectors(U, E).normalize();

/**
 * Scene point at downrange xKm (east along the great circle) and altitude hKm
 * above the ground: the globe is drawn on the WGS84 ellipsoid, about 3 km
 * above the mean sphere at Starbase, so altitude is measured from that.
 */
function along(xKm: number, hKm: number, out = new THREE.Vector3()) {
  const th = xKm / EARTH_RADIUS_KM;
  out.copy(U).multiplyScalar(Math.cos(th)).addScaledVector(E, Math.sin(th));
  const lat = Math.asin(THREE.MathUtils.clamp(out.y, -1, 1)) * (180 / Math.PI);
  return out.multiplyScalar(surfaceRadiusGeocentric(lat) + (ON_PAD_KM + hKm) / EARTH_RADIUS_KM);
}

const smooth = (a: number, b: number, t: number) => THREE.MathUtils.smoothstep(t, a, b);

// Ship (and, until staging, the whole stack): [downrange km, altitude km] at MET t.
// Up to staging: straight up at first, tipping over slowly (about 3 degrees
// from vertical at T+10 s, 12 at T+30 s, 26 at T+1:00), ~10 km up at T+1:00,
// ~40 km at T+2:00, 67 km and ~5,700 km/h at staging.
function shipPath(t: number): [number, number] {
  if (t < STAGING_S) {
    const u = Math.max(0, t) / STAGING_S;
    return [STAGING_DOWNRANGE_KM * u ** 3.2, STAGING_ALT_KM * u ** 2.1 * (1.25 - 0.25 * u)];
  }
  // Ship burn: horizontal speed from ~1.4 to orbital, climbing to level flight at SECO.
  const vx0 = (STAGING_DOWNRANGE_KM * 3.2) / STAGING_S;
  const burn = SECO_S - STAGING_S;
  const xSeco = STAGING_DOWNRANGE_KM + burn * (vx0 + (GROUND_KMS - vx0) / 2.5);
  if (t < SECO_S) {
    const u = (t - STAGING_S) / burn;
    return [STAGING_DOWNRANGE_KM + burn * (vx0 * u + ((GROUND_KMS - vx0) * u ** 2.5) / 2.5), STAGING_ALT_KM + (ORBIT_ALT_KM - STAGING_ALT_KM) * (1 - (1 - u) ** 2)];
  }
  return [xSeco + GROUND_KMS * (t - SECO_S), ORBIT_ALT_KM];
}

// Booster after staging: flips, burns back toward the pad, arcs up to ~95 km,
// falls, lights up again to land and is caught at the pad.
function boosterPath(t: number): [number, number] {
  if (t < STAGING_S) return shipPath(t);
  const u = Math.min(1, (t - STAGING_S) / (BOOSTER_HOME_S - STAGING_S));
  const x = (STAGING_DOWNRANGE_KM + 25 * smooth(0, 0.25, u)) * (1 - smooth(0.12, 0.97, u));
  const a = (BOOSTER_APOGEE_S - STAGING_S) / (BOOSTER_HOME_S - STAGING_S);
  const w = (u - a) / (1 - a); // 0 at apogee .. 1 on the pad
  // Falling, then slowed by the landing burn to touch down gently.
  const h = u < a ? STAGING_ALT_KM + 28 * Math.sin((u / a) * (Math.PI / 2)) : (STAGING_ALT_KM + 28) * (1 - w * w) * (1 - 0.99 * w ** 6);
  return [Math.max(0, x), Math.max(0, h)];
}

const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), basis = new THREE.Matrix4();

/**
 * Nose (+Y) along `dir`; X is the trajectory plane's normal, so Z (the steel
 * side with the PEZ slot) faces up, away from Earth, once flying level and
 * the tiled belly (-Z) faces the ground.
 */
function orient(dir: THREE.Vector3, quat: THREE.Quaternion) {
  const y = dir.clone().normalize();
  const x = N.clone().negate();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  y.crossVectors(z, x).normalize();
  basis.makeBasis(x, y, z);
  return quat.setFromRotationMatrix(basis);
}

const DT = 0.5;
function body(path: (t: number) => [number, number], t: number, b: Body, flip = 0) {
  const [x0, h0] = path(t);
  const [x1, h1] = path(t + DT);
  along(x0, h0, b.pos);
  along(x1, h1, tmpB);
  b.altKm = h0;
  const dir = tmpA.subVectors(tmpB, b.pos);
  b.speed = (dir.length() * EARTH_RADIUS_KM) / DT;
  if (dir.lengthSq() < 1e-16) dir.copy(b.pos); // standing on the pad
  orient(dir, b.quat);
  if (flip) b.quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), flip));
}

const newBody = (): Body => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), altKm: 0, speed: 0, visible: true, flame: 0 });

export function createMissionState(): MissionState {
  return { phase: 'liftoff', ship: newBody(), booster: newBody(), deployed: 0, unfolded: 0, door: 0 };
}

const on = (t: number, from: number, to: number, ramp = 1) => smooth(from, from + ramp, t) * (1 - smooth(to - ramp, to, t));

export function missionAt(t: number, s: MissionState): MissionState {
  body(shipPath, t, s.ship);
  if (t < STAGING_S) {
    body(shipPath, t, s.booster);
    s.booster.visible = true;
    s.booster.flame = on(t, 0, STAGING_S - 1, 1.5);
    s.ship.flame = 0;
  } else {
    // After staging the booster flips and flies tail first: engines toward
    // where it is going for boost-back, and down for landing.
    const flip = Math.PI * smooth(STAGING_S, BOOSTBACK_S[0], t);
    body(boosterPath, t, s.booster, flip);
    s.booster.flame = on(t, BOOSTBACK_S[0], BOOSTBACK_S[1], 2) + on(t, LANDING_BURN_S, BOOSTER_HOME_S, 2);
    s.booster.visible = t < BOOSTER_HOME_S + 20;
    s.ship.flame = on(t, STAGING_S, SECO_S, 1.5);
  }
  s.door = smooth(DOOR_OPEN_S, DOOR_OPEN_S + 20, t) * (1 - smooth(LAST_RELEASE_S + SLIDE_S + 30, LAST_RELEASE_S + SLIDE_S + 50, t));
  s.deployed = t < FIRST_RELEASE_S ? 0 : Math.min(DEPLOY_COUNT, Math.floor((t - FIRST_RELEASE_S) / RELEASE_EVERY_S) + 1);
  const opened = t - FIRST_RELEASE_S - UNFOLD_AFTER_S - UNFOLD_S;
  s.unfolded = opened < 0 ? 0 : Math.min(DEPLOY_COUNT, Math.floor(opened / RELEASE_EVERY_S) + 1);
  s.phase =
    t < 10 ? 'liftoff'
    : t < STAGING_S - 3 ? 'ascent'
    : t < STAGING_S + 8 ? 'hot staging'
    : t < SECO_S ? 'ship burn'
    : t < DOOR_OPEN_S ? 'coast'
    : t < LAST_RELEASE_S + SLIDE_S ? 'deploying'
    : t < MISSION_END_S ? 'unfolding'
    : 'done';
  return s;
}

export interface SatellitePose {
  visible: boolean;
  /** Ship frame, metres: +Y the nose, +Z out of the payload slot. */
  pos: THREE.Vector3;
  /** Always as it lay in the stack: nothing in space turns it. */
  quat: THREE.Quaternion;
  /** Array unfolding, 0 folded .. 1 open. */
  unfold: number;
}

export const newSatellitePose = (): SatellitePose => ({ visible: false, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), unfold: 0 });

/** How far satellite `age` seconds after its release has moved out of the slot (m): speeding up as the dispenser pushes it, then steady. */
export function travelled(age: number) {
  const a = Math.max(0, age);
  return a < SLIDE_S ? (SEPARATION_MS * a * a) / (2 * SLIDE_S) : SEPARATION_MS * (SLIDE_S / 2 + a - SLIDE_S);
}

// The dispenser. The satellites wait in a stack in the payload bay, centred
// STACK_Z toward the slot side so a folded one (bus, folded arrays, dishes
// under it: about 6.2 m across, 5 m deep with the dishes, 1 m tall) sits
// wholly inside the hull. The bottom one is at the slot's height; it is
// pushed out, and once it is clear the stack lowers by one. Only the few
// nearest the slot are drawn: the rest are higher up the bay, out of every
// view. (Our estimates: SpaceX hasn't published the dispenser's layout.)
export const STACK_Z = 1.0;
export const STACK_PITCH = 1.05;
export const STACK_SHOWN = 4;
/** The satellite's middle sits this far above the slot's, so its dishes clear the sill. */
export const SAT_LIFT = 0.1;
const LOWER_FROM_S = 34; // after a release: the satellite has cleared the stack
const LOWER_TO_S = 44;

/** How far down the stack has come at `t`: one step per release, a little after it. */
function lowered(t: number) {
  const i = Math.floor((t - FIRST_RELEASE_S - LOWER_FROM_S) / RELEASE_EVERY_S);
  if (i < 0) return 0;
  const last = Math.min(i, DEPLOY_COUNT - 1);
  const step = smooth(LOWER_FROM_S, LOWER_TO_S, t - FIRST_RELEASE_S - last * RELEASE_EVERY_S);
  return last + step;
}

/**
 * Satellite `k` (0..59) at mission time `t`, in the ship's frame. Until its
 * turn it waits in the stack (drawn only near the slot). It lies across the
 * ship (thin along the ship's length, its folded arrays toward the nose), is
 * pushed out of the slot along +Z and carries on straight out at a steady
 * speed, in line with the others and without turning; its arrays open slowly
 * once it is far from the ship. `slotY` is the slot's height (metres).
 */
export function satelliteAt(k: number, t: number, slotY: number, out: SatellitePose): SatellitePose {
  const age = t - (FIRST_RELEASE_S + k * RELEASE_EVERY_S);
  out.quat.identity();
  out.unfold = 0;
  if (t >= MISSION_END_S) {
    out.visible = false;
    return out;
  }
  if (age < 0) {
    const level = k - lowered(t);
    out.visible = level <= STACK_SHOWN;
    out.pos.set(0, slotY + SAT_LIFT + level * STACK_PITCH, STACK_Z);
    return out;
  }
  out.visible = true;
  out.pos.set(0, slotY + SAT_LIFT, STACK_Z + travelled(age));
  out.unfold = THREE.MathUtils.clamp((age - UNFOLD_AFTER_S) / UNFOLD_S, 0, 1);
  return out;
}
