import * as THREE from 'three';
import { latLonToUnit, unitToLatLon, EARTH_RADIUS_KM } from '@/lib/geo';
import { geodeticToScene, siteFrame } from '@/lib/sites/frame';
import { DECK_M, GROUND_M, ORIGIN } from '@/lib/sites/starbase';

// A Starship Starlink mission as a function of mission elapsed time (MET,
// real seconds after liftoff): ascent from Starbase, hot staging, the booster
// flying home, the ship to orbit, a coast, then 60 Starlink V3 satellites let
// out of the payload slot one at a time. The viewer picks how fast the clock
// runs (components/starship-mission); every event here is on the real clock.
//
// Times follow Starship Flight 10 (26 Aug 2025), the first flight to let
// satellites out: engines lit at T-0:03, booster engine cutoff (MECO) at
// T+2:36 with its 3 centre engines burning on, hot staging at T+2:38,
// boost-back from T+2:48 on 13 engines, the booster's landing burn on 13 then
// 3 for its last 20 s, ship engine cutoff (SECO) at T+8:57, payload door
// opening at T+18:27, then 8 Starlink mass simulators, one about every 53 s
// (all out by T+25:32). A real V3 mission would carry about 60, so here the
// same pace runs on for 60.
//
// In space nothing slows a satellite down: once the dispenser has pushed it
// out it keeps the ship's speed plus a small push straight out of the slot,
// so seen from the ship the satellites rise in a straight, evenly spaced line
// without turning, and each opens its arrays only once it is well clear.
// (Over hours orbital mechanics would curve the line; over this hour it is
// within a few metres of straight.)

/** Pad 2's launch mount at Starbase, Texas (OSM; lib/sites/starbase.ts). */
export const PAD = ORIGIN;
/** The launch heading (degrees from north): ESE, for Flight 15's 30.5° orbit from 26°N (Flight 12's tracked climb ran at 106.9°). */
export const HEADING_DEG = 106.6;

/** A launch's clock starts here: a moment's quiet on the pad, then ignition. */
export const LAUNCH_FROM_S = -5;
export const IGNITION_S = -3; // T-0:03 engines start; the stack rises at T+0
export const MECO_S = 156; // T+2:36 all but the booster's 3 centre engines stop
export const STAGING_S = 158; // T+2:38 hot staging
export const BOOSTBACK_S = [168, 215]; // T+2:48 boost-back burn
const BOOSTER_APOGEE_S = 240;
export const LANDING_BURN_S = 385; // its last 20 s: 13 engines, then 3
const LANDING_SWITCH_S = LANDING_BURN_S + 7;
export const BOOSTER_HOME_S = 405; // T+6:45 back at the pad
export const SECO_S = 537; // T+8:57 ship engine cutoff, in orbit
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

export type Phase = 'ignition' | 'liftoff' | 'ascent' | 'hot staging' | 'ship burn' | 'coast' | 'deploying' | 'unfolding' | 'done';

export interface Body {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  altKm: number;
  /** km/s */
  speed: number;
  visible: boolean;
  /** Share of its engines burning, 0..1. */
  flame: number;
  /** Each engine, 0 off .. 1 burning (see ENGINE_RINGS for the order). */
  lit: Float32Array;
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
/** The ground at the pad as drawn: this high above the ellipsoid (m; the map's relief there is about 1 m). */
export const PAD_GROUND_M = GROUND_M;
/** The booster's base stands on the launch deck, this high above the ellipsoid (km): its engines hang 3 m below it. */
const ON_PAD_KM = (GROUND_M + DECK_M) / 1000;
/** How high the booster's base is above that ground (m) at `altKm` (Body.altKm). */
export const baseClearanceM = (altKm: number) => (ON_PAD_KM + altKm) * 1000 - PAD_GROUND_M;
/** Up at the pad: the ellipsoid's normal, the way the tower stands. */
const PAD_UP = siteFrame(PAD.lat, PAD.lon).up;
// East and north at the pad (geocentric), and downrange along the heading.
const E = new THREE.Vector3(-Math.sin(PAD.lon * (Math.PI / 180)), 0, -Math.cos(PAD.lon * (Math.PI / 180))).normalize();
const NORTH = new THREE.Vector3().crossVectors(U, E).normalize();
const DOWNRANGE = NORTH.clone().multiplyScalar(Math.cos(THREE.MathUtils.degToRad(HEADING_DEG))).addScaledVector(E, Math.sin(THREE.MathUtils.degToRad(HEADING_DEG)));
/** The flight's plane: its normal points to the left of the heading. */
const N = new THREE.Vector3().crossVectors(U, DOWNRANGE).normalize();

/**
 * Scene point at downrange xKm (along the great circle on the heading) and
 * altitude hKm above the ground there: the globe is drawn on the WGS84
 * ellipsoid, so height is measured along its normal from it.
 */
const dirTmp = new THREE.Vector3();
function along(xKm: number, hKm: number, out = new THREE.Vector3()) {
  const th = xKm / EARTH_RADIUS_KM;
  dirTmp.copy(U).multiplyScalar(Math.cos(th)).addScaledVector(DOWNRANGE, Math.sin(th));
  // The ground point in that direction from the centre, exactly (on the pad, the mount to within a millimetre).
  const ll = unitToLatLon(dirTmp);
  return geodeticToScene(ll.lat, ll.lon, (ON_PAD_KM + hKm) * 1000, out);
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
  const vx0 = STAGING_KMS;
  const burn = SECO_S - STAGING_S;
  const xSeco = STAGING_DOWNRANGE_KM + burn * (vx0 + (GROUND_KMS - vx0) / 2.5);
  if (t < SECO_S) {
    const u = (t - STAGING_S) / burn;
    return [STAGING_DOWNRANGE_KM + burn * (vx0 * u + ((GROUND_KMS - vx0) * u ** 2.5) / 2.5), STAGING_ALT_KM + (ORBIT_ALT_KM - STAGING_ALT_KM) * (1 - (1 - u) ** 2)];
  }
  return [xSeco + GROUND_KMS * (t - SECO_S), ORBIT_ALT_KM];
}

/** The stack's speed downrange at staging (km/s). */
const STAGING_KMS = (STAGING_DOWNRANGE_KM * 3.2) / STAGING_S;

// Booster after staging: flips, burns back toward the pad, arcs up to ~95 km,
// falls (fastest, about 0.9 km/s, near 50 km up, then slowed by the air to
// about 270 m/s), lights up again 2 km up and is caught at the pad 20 s later.
// At first it keeps to the ship's path (the two part slowly, then faster),
// coasting on downrange at the stack's speed.
const APOGEE_KM = STAGING_ALT_KM + 28;
/** How long the booster takes to drift from the ship's path onto its own (s). */
const SEPARATION_S = 20;
/** How much further downrange it coasts before turning back (km). */
const COAST_KM = 25;
/** It flips about its middle (m above its base), starting this long after staging (s). */
export const FLIP_PIVOT_M = 30;
const FLIP_FROM_S = STAGING_S + 2;
const BURN_FROM_KM = 2;
const BURN_FROM_KMS = 0.27;
/** A smooth path from height h0 (km), climbing at v0 (km/s), to h1 at v1, over `span` s; `u` 0..1. */
function hermite(u: number, span: number, h0: number, v0: number, h1: number, v1: number) {
  const u2 = u * u, u3 = u2 * u;
  return h0 * (2 * u3 - 3 * u2 + 1) + v0 * span * (u3 - 2 * u2 + u) + h1 * (3 * u2 - 2 * u3) + v1 * span * (u3 - u2);
}
function boosterPath(t: number): [number, number] {
  if (t < STAGING_S) return shipPath(t);
  const u = Math.min(1, (t - STAGING_S) / (BOOSTER_HOME_S - STAGING_S));
  const coast = COAST_KM * (1 - Math.exp((-(t - STAGING_S) * STAGING_KMS) / COAST_KM));
  const x = (STAGING_DOWNRANGE_KM + coast) * (1 - smooth(0.12, 0.97, u));
  let h: number;
  if (t < BOOSTER_APOGEE_S) h = STAGING_ALT_KM + (APOGEE_KM - STAGING_ALT_KM) * Math.sin(((t - STAGING_S) / (BOOSTER_APOGEE_S - STAGING_S)) * (Math.PI / 2));
  else if (t < LANDING_BURN_S) {
    const span = LANDING_BURN_S - BOOSTER_APOGEE_S;
    h = hermite((t - BOOSTER_APOGEE_S) / span, span, APOGEE_KM, 0, BURN_FROM_KM, -BURN_FROM_KMS);
  } else {
    // The landing burn: braking hard on 13 engines, then gently on 3.
    const span = BOOSTER_HOME_S - LANDING_BURN_S;
    h = hermite(Math.min(1, (t - LANDING_BURN_S) / span), span, BURN_FROM_KM, -BURN_FROM_KMS, 0, 0);
  }
  const w = smooth(STAGING_S, STAGING_S + SEPARATION_S, t);
  const [xs, hs] = shipPath(t);
  return [Math.max(0, xs + (x - xs) * w), Math.max(0, h * w + hs * (1 - w))];
}

const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), basis = new THREE.Matrix4();
const shipAxis = new THREE.Vector3(), apart = new THREE.Vector3();
const flipTurn = new THREE.Quaternion();
const X_AXIS = new THREE.Vector3(1, 0, 0);

/**
 * Nose (+Y) along `dir`; X is the trajectory plane's normal, so Z (the steel
 * side with the PEZ slot) faces up, away from Earth, once flying level and
 * the tiled belly (-Z) faces the ground.
 */
function orient(dir: THREE.Vector3, quat: THREE.Quaternion) {
  // The nose exactly along `dir`; X as near the plane's normal as that allows.
  const y = dir.clone().normalize();
  const x = N.clone().negate();
  x.addScaledVector(y, -x.dot(y)).normalize();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
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
  if (dir.lengthSq() < 1e-16) dir.copy(PAD_UP); // standing on the pad, plumb
  orient(dir, b.quat);
  if (flip) b.quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), flip));
}

const newBody = (engines: number): Body => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), altKm: 0, speed: 0, visible: true, flame: 0, lit: new Float32Array(engines) });

/**
 * The engines, ring by ring, in the order Body.lit (and the models) use:
 * Super Heavy's 3 centre, 10 middle and 20 outer Raptors; Starship's 3
 * sea-level and 3 vacuum Raptors.
 */
export const ENGINE_RINGS = { booster: [3, 10, 20], ship: [3, 3] } as const;
const BOOSTER_ENGINES = 33;
const SHIP_ENGINES = 6;

/** 0..1 per engine, the same every run: how it varies from the others when they all start together. */
const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
/** On from `from` (full 0.3 s later), off from `to` (out 0.15 s later). */
const burning = (t: number, from: number, to: number) => smooth(from, from + 0.3, t) * (1 - smooth(to, to + 0.15, t));

/**
 * How lit Super Heavy's engine `i` is at mission time `t`, 0..1. At ignition
 * the centre ring lights first, then the middle, then the outer, over about
 * 1.5 s (the order is real; the times are our estimate). At MECO all but the
 * centre 3 stop; those burn on through hot staging, the flip and the
 * boost-back, for which the middle 10 light again; the landing burn starts on
 * all 13 and ends on the centre 3.
 */
export function boosterEngineLit(i: number, t: number) {
  const j = jitter(i);
  if (i < 3) return burning(t, IGNITION_S + 0.2 * j, BOOSTBACK_S[1]) + burning(t, LANDING_BURN_S + 0.2 * j, BOOSTER_HOME_S);
  if (i < 13) {
    return burning(t, IGNITION_S + 0.3 + 0.4 * j, MECO_S + 0.2 * j) + burning(t, BOOSTBACK_S[0] + 0.5 * j, BOOSTBACK_S[1]) + burning(t, LANDING_BURN_S + 0.2 * j, LANDING_SWITCH_S + 0.3 * j);
  }
  return burning(t, IGNITION_S + 0.8 + 0.7 * j, MECO_S + 0.2 * j);
}

/**
 * When the booster's plume last started and stopped at mission time `t` (the
 * gas reaches out from the nozzles after the one and leaves them after the
 * other). Its centre 3 engines burn from ignition through hot staging and the
 * boost-back, so at MECO the plume only shrinks: it leaves the nozzles when
 * the boost-back ends, and comes back for the landing burn.
 */
export function boosterGas(t: number): { on: number; off: number } {
  if (t >= LANDING_BURN_S - 1) return { on: LANDING_BURN_S, off: BOOSTER_HOME_S };
  return { on: IGNITION_S, off: t < BOOSTBACK_S[1] ? Infinity : BOOSTBACK_S[1] };
}

/** How lit Starship's engine `i` (sea-level 0..2, vacuum 3..5) is at `t`: all six from hot staging to SECO. */
export function shipEngineLit(i: number, t: number) {
  return burning(t, STAGING_S + 0.3 * jitter(i + 40), SECO_S);
}

function light(b: Body, lit: (i: number, t: number) => number, t: number) {
  let sum = 0;
  for (let i = 0; i < b.lit.length; i++) sum += b.lit[i] = lit(i, t);
  b.flame = sum / b.lit.length;
}

/** Mission time as a launch clock shows it: T-0:03 counting down, then T+2:38. */
export function formatMet(t: number) {
  const s = t < 0 ? Math.ceil(-t) : Math.floor(t);
  return `T${t < 0 ? '\u2212' : '+'}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function createMissionState(): MissionState {
  return { phase: 'ignition', ship: newBody(SHIP_ENGINES), booster: newBody(BOOSTER_ENGINES), deployed: 0, unfolded: 0, door: 0 };
}

export function missionAt(t: number, s: MissionState): MissionState {
  body(shipPath, t, s.ship);
  if (t < STAGING_S) {
    body(shipPath, t, s.booster);
    s.booster.visible = true;
  } else {
    // After staging the booster flips about its middle and flies tail first:
    // engines toward where it is going for boost-back, and down for landing.
    const flip = Math.PI * smooth(FLIP_FROM_S, BOOSTBACK_S[0], t);
    body(boosterPath, t, s.booster);
    // The ship pushes straight off it: for the first second they part only
    // along the ship's axis, then the booster drifts onto its own path.
    shipAxis.set(0, 1, 0).applyQuaternion(s.ship.quat);
    apart.subVectors(s.booster.pos, s.ship.pos);
    const behind = apart.dot(shipAxis);
    apart.addScaledVector(shipAxis, -behind).multiplyScalar(smooth(STAGING_S + 1, STAGING_S + 5, t));
    s.booster.pos.copy(s.ship.pos).addScaledVector(shipAxis, behind).add(apart);
    if (flip > 0) {
      tmpA.set(0, 1, 0).applyQuaternion(s.booster.quat);
      s.booster.quat.multiply(flipTurn.setFromAxisAngle(X_AXIS, flip));
      tmpB.set(0, 1, 0).applyQuaternion(s.booster.quat);
      s.booster.pos.addScaledVector(tmpA.sub(tmpB), FLIP_PIVOT_M / 1000 / EARTH_RADIUS_KM);
    }
    s.booster.visible = t < BOOSTER_HOME_S + 20;
  }
  light(s.booster, boosterEngineLit, t);
  light(s.ship, shipEngineLit, t);
  s.door = smooth(DOOR_OPEN_S, DOOR_OPEN_S + 20, t) * (1 - smooth(LAST_RELEASE_S + SLIDE_S + 30, LAST_RELEASE_S + SLIDE_S + 50, t));
  s.deployed = t < FIRST_RELEASE_S ? 0 : Math.min(DEPLOY_COUNT, Math.floor((t - FIRST_RELEASE_S) / RELEASE_EVERY_S) + 1);
  const opened = t - FIRST_RELEASE_S - UNFOLD_AFTER_S - UNFOLD_S;
  s.unfolded = opened < 0 ? 0 : Math.min(DEPLOY_COUNT, Math.floor(opened / RELEASE_EVERY_S) + 1);
  s.phase =
    t < 0 ? 'ignition'
    : t < 10 ? 'liftoff'
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
