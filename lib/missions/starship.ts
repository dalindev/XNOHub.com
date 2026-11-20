import * as THREE from 'three';
import { latLonToUnit, EARTH_RADIUS_KM } from '@/lib/geo';

// A Starship Starlink mission as a function of wall-clock seconds since
// liftoff: ascent from Starbase, hot staging, booster boost-back and catch,
// ship to orbit, then V3 satellites leaving the PEZ slot one by one.
// The burns are time-compressed (real staging is ~T+2:40, orbit ~T+8:30);
// once in orbit it runs in real time at ~7.8 km/s.

export const PAD = { lat: 25.997, lon: -97.157 }; // Starbase, Texas
export const STAGING_S = 26;
export const ORBIT_S = 60;
export const DEPLOY_S = 70;
export const DEPLOY_EVERY_S = 3.5;
export const DEPLOY_COUNT = 12;
export const MISSION_END_S = DEPLOY_S + DEPLOY_EVERY_S * DEPLOY_COUNT + 15;
const ORBIT_ALT_KM = 230;
const ORBIT_KMS = 7.8;

export type Phase = 'liftoff' | 'ascent' | 'staging' | 'ship burn' | 'orbit' | 'deploying' | 'done';

export interface Body {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  altKm: number;
  visible: boolean;
  flame: number; // 0..1 engine plume
}

export interface MissionState {
  phase: Phase;
  /** Time compression in this phase (1 = real time). */
  compression: number;
  ship: Body;
  booster: Body;
  /** Satellites out of the slot so far. */
  deployed: number;
  /** 0 closed .. 1 open */
  door: number;
}

const U = latLonToUnit(PAD.lat, PAD.lon);
// East at the pad: derivative of latLonToUnit with respect to longitude.
const E = new THREE.Vector3(-Math.sin(PAD.lon * (Math.PI / 180)), 0, -Math.cos(PAD.lon * (Math.PI / 180))).normalize();
const N = new THREE.Vector3().crossVectors(U, E).normalize();

/** Scene point at downrange xKm (east along the great circle) and altitude hKm. */
function along(xKm: number, hKm: number, out = new THREE.Vector3()) {
  const th = xKm / EARTH_RADIUS_KM;
  return out
    .copy(U)
    .multiplyScalar(Math.cos(th))
    .addScaledVector(E, Math.sin(th))
    .multiplyScalar(1 + hKm / EARTH_RADIUS_KM);
}

const smooth = (a: number, b: number, t: number) => THREE.MathUtils.smoothstep(t, a, b);

// Ship trajectory: [downrange km, altitude km] at mission time t.
function shipPath(t: number): [number, number] {
  if (t < STAGING_S) {
    const u = Math.max(0, t) / STAGING_S;
    return [65 * u ** 2.4, 70 * u ** 1.8];
  }
  if (t < ORBIT_S) {
    const u = (t - STAGING_S) / (ORBIT_S - STAGING_S);
    return [65 + 1735 * u ** 1.6, 70 + (ORBIT_ALT_KM - 70) * (1 - (1 - u) ** 2)];
  }
  return [1800 + ORBIT_KMS * (t - ORBIT_S), ORBIT_ALT_KM];
}

// Booster after staging: flip, boost back toward the pad, landing burn, caught.
function boosterPath(t: number): [number, number] {
  if (t < STAGING_S) return shipPath(t);
  const u = Math.min(1, (t - STAGING_S) / 30);
  const x = 65 * (1 - smooth(0, 1, u)) + 8 * Math.sin(u * Math.PI) * (1 - u);
  const h = 70 + 30 * Math.sin(Math.min(u * 1.6, 1) * Math.PI * 0.5) * (1 - u) - 70 * u ** 2.2;
  return [Math.max(0, x), Math.max(0.15, h)];
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

function body(path: (t: number) => [number, number], t: number, b: Body, flip = 0) {
  const [x0, h0] = path(t);
  const [x1, h1] = path(t + 0.05);
  along(x0, h0, b.pos);
  along(x1, h1, tmpB);
  b.altKm = h0;
  const dir = tmpA.subVectors(tmpB, b.pos);
  if (dir.lengthSq() < 1e-14) dir.copy(b.pos); // standing on the pad
  orient(dir, b.quat);
  if (flip) b.quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), flip));
}

const newBody = (): Body => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), altKm: 0, visible: true, flame: 0 });

export function createMissionState(): MissionState {
  return { phase: 'liftoff', compression: 6, ship: newBody(), booster: newBody(), deployed: 0, door: 0 };
}

export function missionAt(t: number, s: MissionState): MissionState {
  body(shipPath, t, s.ship);
  if (t < STAGING_S) {
    body(shipPath, t, s.booster);
    s.booster.visible = true;
    s.booster.flame = smooth(0, 1.5, t);
    s.ship.flame = 0;
  } else {
    // Boost-back: the booster flies tail-first back home, so flip it over.
    const flip = Math.PI * smooth(STAGING_S, STAGING_S + 6, t);
    body(boosterPath, t, s.booster, flip);
    // Velocity points back toward the pad after the flip; keep engines facing travel.
    const bt = t - STAGING_S;
    s.booster.flame = (bt > 4 && bt < 12 ? 1 : 0) + (bt > 25 && bt < 30 ? 1 : 0);
    s.booster.visible = bt < 33;
    s.ship.flame = t < ORBIT_S ? smooth(STAGING_S, STAGING_S + 1, t) : 0;
  }
  s.compression = t < STAGING_S ? 6 : t < ORBIT_S ? 10 : 1;
  s.door = smooth(DEPLOY_S - 3, DEPLOY_S - 1, t) * (1 - smooth(MISSION_END_S - 8, MISSION_END_S - 6, t));
  s.deployed = t < DEPLOY_S ? 0 : Math.min(DEPLOY_COUNT, Math.floor((t - DEPLOY_S) / DEPLOY_EVERY_S) + 1);
  s.phase =
    t < 4 ? 'liftoff'
    : t < STAGING_S ? 'ascent'
    : t < STAGING_S + 4 ? 'staging'
    : t < ORBIT_S ? 'ship burn'
    : t < DEPLOY_S ? 'orbit'
    : t < MISSION_END_S ? 'deploying'
    : 'done';
  return s;
}
