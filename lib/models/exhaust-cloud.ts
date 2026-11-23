import * as THREE from 'three';
import { latLonToUnit } from '@/lib/geo';
import { flameNoise } from '@/lib/plume/noise';
import { FLAME, unitLuminance } from '@/lib/plume/palette';
import { column, newSkyState, radiance, skyAt, skyLight, transmittance } from '@/lib/sky-model';
import { SUNLIT_WHITE } from '@/lib/world';

// The cloud of steam that boils out of the pad when Super Heavy lights its 33
// engines. The water-cooled flame trench under the mount splits the exhaust
// in two: fire and steam blast out of both of its ends (42 m from the mount,
// facing 123° and 303°) and climb into two towers taller than the launch
// tower within seconds, while steam off the deck rolls out along the ground
// all round. Then the cloud keeps rising for minutes, swells, thins and
// drifts off east on the wind. Sizes and timings come from launch photos and
// the Shuttle's measured clouds (docs/flames.md); the billows themselves are
// generated.
//
// Higher up, from about 5 to 45 km, the stack leaves a white condensation
// trail behind its plume (thick in launch photos from T+40 s on), widening
// behind it at about 13°, then drifting and twisting on the winds aloft.
//
// At hot staging, 67 km up, the ship's exhaust blasting out of the booster's
// ring (lib/plume/staging-vents) flies out at about a kilometre a second,
// glowing, and stops within a few hundred metres, once it has swept up its
// own mass of the thin air: a ring of grey-lavender exhaust 400 to 600 m
// across, left behind in the sky (seen from the ground after Flight 5).
//
// Each puff is a soft ball (the trail's, stretched along the path) drawn as a
// square facing the camera, whose shader works out how much steam the line of
// sight crosses inside it (above the ground and beyond the camera's near
// plane). So puffs meet the ground and each other without hard edges, and
// show no outline of their square. Lit by the Sun (dimmed by the puffs
// between it and the Sun, reddened low in the sky, gone in the Earth's
// shadow), by the sky, and by the flame. Two instanced draws, both sorted
// back to front: the puffs farther away than the flame, drawn before it, and
// the nearer ones, drawn after it.
//
// Frame: metres, origin on the ground at the mount, +Y up, +X along the trench
// toward its south-east end (padFrame).

/** Which way the flame trench runs (degrees from north), toward its south-east end; its other end faces the opposite way. */
export const TRENCH_BEARING = 123.2;
/** How far each end of the trench is from the mount (m). */
export const TRENCH_EXIT_M = 42;

const enum Kind {
  Jet,
  Skirt,
  Mist,
  Trail,
  /** Hot staging's exhaust; drawn with its glow's warmth added (Kind.Stage + 0.4 at the most). */
  Stage
}

interface Puff {
  kind: Kind;
  /** Seconds after ignition it leaves the trench (or the deck). */
  born: number;
  /** Where it starts (m), and which way it goes (a horizontal unit vector). */
  x0: number;
  y0: number;
  z0: number;
  dx: number;
  dz: number;
  /** How fast it leaves (m/s), out and up. */
  out: number;
  up: number;
  /** Its radius as it leaves and once it has slowed (m). */
  r0: number;
  r1: number;
  /** Optical depth straight through its middle once it has slowed. */
  tau: number;
  /** How much of the cloud's slow climb it takes part in: the cloud stays a column, rooted near the ground. */
  lift: number;
  seed: number;
}

const JETS = 2 * 88;
const SKIRT = 80;
const MIST = 24;
export const PUFFS = JETS + SKIRT + MIST;

/** How fast the jets out of the trench slow in the air (s). */
const DRAG_S = 2.4;
/** The warm cloud's slow climb: how high it levels off (m) and how fast it gets there (s). */
const RISE_M = 1800;
const RISE_S = 260;
/** Once slowed it keeps spreading sideways (m/s) and swelling as it mixes with the air (m/s). */
const SPREAD_MS = 3;
const SWELL_MS = 0.5;
/** The wind near the ground (m/s, toward the east from 20 s on), stronger higher up. */
const WIND_MS = 5;

function makePuffs(): Puff[] {
  let s = 23;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const puffs: Puff[] = [];
  // Out of both ends of the trench: most in the first seconds, while the
  // flame is still in the trench, then fewer.
  for (let i = 0; i < JETS; i++) {
    const side = i % 2 ? 1 : -1;
    const fan = (rand() - 0.5) * 0.9;
    const k = (i >> 1) / (JETS / 2);
    puffs.push({
      kind: Kind.Jet,
      born: 11 * Math.pow(k, 1.5) + rand() * 0.15,
      x0: side * TRENCH_EXIT_M,
      y0: 3,
      z0: (rand() - 0.5) * 12,
      dx: side * Math.cos(fan),
      dz: Math.sin(fan),
      out: 40 + 35 * rand(),
      up: 22 + 20 * rand(),
      r0: 6 + 5 * rand(),
      r1: 22 + 22 * rand(),
      tau: 3 + 3 * rand(),
      lift: 0.12 + 1.05 * Math.pow(rand(), 0.7),
      seed: rand()
    });
  }
  // Off the deck, rolling out along the ground all round.
  for (let i = 0; i < SKIRT; i++) {
    const a = rand() * Math.PI * 2;
    puffs.push({
      kind: Kind.Skirt,
      born: 0.2 + 8 * Math.pow(i / SKIRT, 1.3) + rand() * 0.2,
      x0: Math.cos(a) * 8,
      y0: 4,
      z0: Math.sin(a) * 8,
      dx: Math.cos(a),
      dz: Math.sin(a),
      out: 20 + 15 * rand(),
      up: 3 + 3 * rand(),
      r0: 8,
      r1: 20 + 14 * rand(),
      tau: 2.5 + 1.5 * rand(),
      lift: 0.04 + 0.3 * rand(),
      seed: rand()
    });
  }
  // Water mist at both ends of the trench before ignition, from the deluge.
  for (let i = 0; i < MIST; i++) {
    const side = i % 2 ? 1 : -1;
    const fan = (rand() - 0.5) * 1.4;
    puffs.push({
      kind: Kind.Mist,
      born: -14 + 13 * (i / MIST),
      x0: side * TRENCH_EXIT_M,
      y0: 4,
      z0: (rand() - 0.5) * 14,
      dx: side * Math.cos(fan),
      dz: Math.sin(fan),
      out: 3 + 3 * rand(),
      up: 1.5,
      r0: 5,
      r1: 11 + 6 * rand(),
      tau: 0.5 + 0.3 * rand(),
      lift: 0.03,
      seed: rand()
    });
  }
  return puffs;
}

export interface PuffState {
  x: number;
  y: number;
  z: number;
  r: number;
  /** Optical depth through its middle now. */
  tau: number;
  /** Seconds since it left. */
  age: number;
}

const newPuffState = (): PuffState => ({ x: 0, y: 0, z: 0, r: 0, tau: 0, age: 0 });
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => clamp01(x) * clamp01(x) * (3 - 2 * clamp01(x));

/** Where puff `p` is `t` s after ignition, with the wind blowing along (windX, windZ); false before it has left. */
function puffAt(p: Puff, t: number, windX: number, windZ: number, out: PuffState) {
  const a = t - p.born;
  if (a <= 0) return false;
  const slowed = (k: number) => k * (1 - Math.exp(-a / k));
  const run = slowed(p.kind === Kind.Skirt ? 3 : DRAG_S);
  const climb = RISE_M * (1 - Math.exp(-a / RISE_S)) * smooth((a - 2) / 10) * p.lift;
  const y = p.y0 + p.up * run * (p.kind === Kind.Jet ? 1 : 0.5) + climb;
  const across = p.out * run + SPREAD_MS * Math.max(0, a - 6) * (p.kind === Kind.Mist ? 0.2 : 1);
  const drift = WIND_MS * Math.max(0, a - 20) * (1 + y / 1000);
  out.x = p.x0 + p.dx * across + windX * drift;
  out.y = y;
  out.z = p.z0 + p.dz * across + windZ * drift;
  out.r = p.r0 + (p.r1 - p.r0) * (1 - Math.exp(-a / 2.5)) + 0.18 * Math.max(0, y - p.y0) + SWELL_MS * a;
  const life = p.kind === Kind.Mist ? 1 - smooth((a - 8) / 17) : 1 - smooth((a - 600) / 2400);
  out.tau = p.tau * Math.min(1, p.r1 / out.r) * smooth(a / 0.5) * life;
  out.age = a;
  return out.tau > 0.002;
}

const PUFF_LIST = makePuffs();

/** The whole cloud `t` s after ignition: how high its top is, how far it reaches along the trench either way and across it (m). Pure; for tests. */
export function cloudExtent(t: number) {
  const s = newPuffState();
  let top = 0, along = 0, across = 0, n = 0;
  for (const p of PUFF_LIST) {
    if (!puffAt(p, t, 0, 0, s) || s.tau < 0.3) continue;
    n++;
    top = Math.max(top, s.y + s.r);
    along = Math.max(along, Math.abs(s.x) + s.r);
    across = Math.max(across, Math.abs(s.z) + s.r);
  }
  return { top, along, across, puffs: n };
}

// The condensation trail.

/** One puff of the trail, left where the stack passed. */
export interface TrailPuff {
  /** Seconds after ignition the stack passed. */
  born: number;
  /** Where (m, pad frame) and the path's direction there. */
  x0: number;
  y0: number;
  z0: number;
  ax: number;
  ay: number;
  az: number;
  /** The stack's speed then (m/s), and how far it is to the next puff along the path (m). */
  speed: number;
  spacing: number;
  seed: number;
}

/** Where the trail starts and ends (km up), fading in and out over the next few km. */
const TRAIL_KM = [5, 45] as const;
/** Puffs every this many metres of the path. */
const TRAIL_EVERY_M = 300;
/** It widens behind the stack at about 13° (tan 13°), up to a width that grows with height (m, m per km). */
const TRAIL_SPREAD = 0.23;
const TRAIL_CAP_M = [50, 2.5] as const;
/** Optical depth across it near the stack, and how long it lasts (s): fading from 4 min, gone by 24. */
const TRAIL_TAU = 2.5;
const TRAIL_LIFE_S = [240, 1440] as const;

/**
 * The trail's puffs, from `pathAt` (where the stack's engines are, in this
 * frame, `t` s after ignition): one every TRAIL_EVERY_M of path between
 * TRAIL_KM. Pure; run once.
 */
export function buildTrail(pathAt: (sinceIgnition: number, out: THREE.Vector3) => boolean, from = 40, to = 160): TrailPuff[] {
  const puffs: TrailPuff[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  let seed = 41;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const dt = 0.05;
  if (!pathAt(from, a)) return puffs;
  let travelled = TRAIL_EVERY_M;
  for (let t = from + dt; t <= to; t += dt) {
    if (!pathAt(t, b)) break;
    const step = a.distanceTo(b);
    travelled += step;
    const km = b.y / 1000;
    if (travelled >= TRAIL_EVERY_M && km >= TRAIL_KM[0] - 1 && km <= TRAIL_KM[1] + 3 && step > 0) {
      travelled = 0;
      puffs.push({
        born: t,
        x0: b.x,
        y0: b.y,
        z0: b.z,
        ax: (b.x - a.x) / step,
        ay: (b.y - a.y) / step,
        az: (b.z - a.z) / step,
        speed: step / dt,
        spacing: TRAIL_EVERY_M,
        seed: rand()
      });
    }
    a.copy(b);
  }
  return puffs;
}

/** The wind at `y` m (this frame): from the east-ish surface breeze to a ~30 m/s jet stream near 12 km, turning with height (so the trail twists). */
function windAt(y: number, east: THREE.Vector3, out: { x: number; z: number }) {
  const km = y / 1000;
  const speed = 5 + 25 * smooth((km - 3) / 9) * (1 - 0.6 * smooth((km - 15) / 10));
  const turn = 0.6 * Math.sin(km / 7);
  const c = Math.cos(turn), s = Math.sin(turn);
  out.x = (east.x * c - east.z * s) * speed;
  out.z = (east.x * s + east.z * c) * speed;
  return out;
}

/** Where trail puff `p` is `t` s after ignition; false before the stack has passed or once it has gone. */
function trailAt(p: TrailPuff, t: number, east: THREE.Vector3, out: PuffState & { stretch: number }, wind: { x: number; z: number }) {
  const a = t - p.born;
  if (a <= 0) return false;
  const km = p.y0 / 1000;
  const band = smooth((km - TRAIL_KM[0]) / 4) * (1 - smooth((km - (TRAIL_KM[1] - 10)) / 10));
  const life = 1 - smooth((a - TRAIL_LIFE_S[0]) / (TRAIL_LIFE_S[1] - TRAIL_LIFE_S[0]));
  windAt(p.y0, east, wind);
  out.x = p.x0 + wind.x * a;
  out.y = p.y0;
  out.z = p.z0 + wind.z * a;
  out.r = 6 + Math.min(p.speed * a * TRAIL_SPREAD, TRAIL_CAP_M[0] + TRAIL_CAP_M[1] * km) + 0.8 * a;
  // Stretched along the path so neighbours overlap into one trail.
  out.stretch = THREE.MathUtils.clamp((1.2 * p.spacing) / out.r, 1, 6);
  // It forms behind the plume, a few hundred metres back.
  out.tau = TRAIL_TAU * Math.min(1, 40 / out.r) * band * life * smooth((p.speed * a - 150) / 300);
  out.age = a;
  return out.tau > 0.002;
}

// Hot staging's exhaust.

/** One puff of it, out of the ring at one moment. */
export interface StagePuff {
  /** Seconds after ignition it came out. */
  born: number;
  /** Where (m, pad frame) and how fast (m/s): the stack's speed plus its own, out from the ring. */
  x0: number;
  y0: number;
  z0: number;
  vx: number;
  vy: number;
  vz: number;
  /** The stack's direction, and how far apart along it the rings are (m): each puff is stretched along it to meet the next ring's. */
  ax: number;
  ay: number;
  az: number;
  spacing: number;
  /** How big it gets (m); how bright its own glow is at first (0..1), and how orange. */
  r1: number;
  glow: number;
  warm: number;
  seed: number;
}

/** A ring of puffs every STAGE_EVERY_S from 0.3 s after staging to STAGE_UNTIL_S, STAGE_ROUND of them round it. */
const STAGE_EVERY_S = 0.15;
const STAGE_UNTIL_S = 2.1;
const STAGE_ROUND = 18;
/**
 * A ring `after` s after staging: through the vents while the ship sits on
 * the ring, then off the dome's rim as it pulls away (lib/plume/staging-vents).
 * How fast it flies out (m/s), how far back it leans (radians, toward the
 * booster's base), and how bright and how orange its own glow is at first.
 */
function stageRing(after: number) {
  const vents = after < 1.15;
  return {
    speed: vents ? 950 : 750 - 200 * ((after - 1.15) / (STAGE_UNTIL_S - 1.15)),
    lean: vents ? 0.17 : 0.45,
    glow: vents ? Math.min(1, 0.5 + after) : 0.6 * (1 - 0.6 * ((after - 1.15) / (STAGE_UNTIL_S - 1.15))),
    warm: 1 - smooth((after - 0.2) / 1.2),
    sheet: !vents
  };
}
/**
 * The thin air stops it in about this long (s): some 4 t of exhaust has swept
 * up as much air (at 67 km, 1.5e-4 kg/m³) within 200 m or so. And how long it
 * lasts: fading from 20 s, gone by 2.5 min.
 */
const STAGE_STOP_S = 0.2;
const STAGE_LIFE_S = [20, 150] as const;

/** Where the booster's hot-staging ring is `sinceIgnition` s after ignition: its middle (m) and the booster's axis. */
export type VentsAt = (sinceIgnition: number, centre: THREE.Vector3, axis: THREE.Vector3) => boolean;

/**
 * Hot staging's exhaust puffs. `pathAt` is the trail's (where the stack's
 * engines are, this frame, `t` s after ignition); `at` when the ship's
 * engines light (s after ignition) and `ringAbove` how far the ring is above
 * the engines (m). Each puff leaves the booster's ring where `ventsAt` says
 * it is at that moment, with its speed; without `ventsAt`, where the stack's
 * last moments before staging carry it in a straight line. The rings are
 * left a couple of hundred metres apart along the path, so the exhaust makes
 * a tube, a ring seen end-on (from the ground, looking up the path). Pure;
 * run once.
 */
export function buildStaging(pathAt: (sinceIgnition: number, out: THREE.Vector3) => boolean, at: number, ringAbove: number, ventsAt?: VentsAt): StagePuff[] {
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  if (!pathAt(at - 0.25, a) || !pathAt(at - 0.05, b)) return [];
  const v = b.clone().sub(a).divideScalar(0.2);
  if (v.lengthSq() < 1) return [];
  const axis = v.clone().normalize();
  // The ring's middle at staging, carried on in a straight line (without `ventsAt`).
  const ring = b.clone().addScaledVector(axis, ringAbove).addScaledVector(v, 0.05);
  let seed = 977;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = new THREE.Vector3(), dir = new THREE.Vector3(), p = new THREE.Vector3();
  // The ring at a puff's birth: its middle, the booster's axis, two directions across it, and how fast it moves.
  const centre = new THREE.Vector3(), ax = new THREE.Vector3(), u = new THREE.Vector3(), w = new THREE.Vector3();
  const vRing = new THREE.Vector3(), before = new THREE.Vector3(), ahead = new THREE.Vector3(), spare = new THREE.Vector3();
  const travel = new THREE.Vector3();
  const puffs: StagePuff[] = [];
  for (let after = 0.3, i = 0; after <= STAGE_UNTIL_S + 1e-6; after += STAGE_EVERY_S, i++) {
    const k = stageRing(after);
    for (let j = 0; j < STAGE_ROUND; j++) {
      // Round the ring, each ring turned from the last (golden angle) so they don't line up.
      const angle = ((j + 0.3 * rand()) / STAGE_ROUND) * 2 * Math.PI + i * 2.39996;
      const born = at + after + 0.04 * rand();
      if (ventsAt && ventsAt(born, centre, ax) && ventsAt(born - 0.02, before, spare) && ventsAt(born + 0.02, ahead, spare)) {
        vRing.subVectors(ahead, before).divideScalar(0.04);
      } else {
        centre.copy(ring).addScaledVector(v, born - at);
        ax.copy(axis);
        vRing.copy(v);
      }
      u.crossVectors(ax, Math.abs(ax.y) < 0.9 ? spare.set(0, 1, 0) : spare.set(1, 0, 0)).normalize();
      w.crossVectors(ax, u);
      out.copy(u).multiplyScalar(Math.sin(angle)).addScaledVector(w, Math.cos(angle));
      dir.copy(out).multiplyScalar(Math.cos(k.lean)).addScaledVector(ax, -Math.sin(k.lean));
      // Where it leaves: at the vents (or the dome's rim, 1.25 m higher).
      p.copy(centre).addScaledVector(out, 4.5).addScaledVector(ax, k.sheet ? 1.25 : 0);
      const speed = k.speed * (0.75 + 0.5 * rand());
      // The rings are laid along the booster's path, as far apart as it moves between them.
      travel.copy(vRing).normalize();
      puffs.push({
        born,
        x0: p.x,
        y0: p.y,
        z0: p.z,
        vx: vRing.x + dir.x * speed,
        vy: vRing.y + dir.y * speed,
        vz: vRing.z + dir.z * speed,
        ax: travel.x,
        ay: travel.y,
        az: travel.z,
        spacing: vRing.length() * STAGE_EVERY_S,
        r1: (k.sheet ? 60 : 50) + 35 * rand(),
        glow: k.glow,
        warm: k.warm,
        seed: rand()
      });
    }
  }
  return puffs;
}

/** Where staging puff `p` is `t` s after ignition; false before it is out or once it has gone. */
export function stageAt(p: StagePuff, t: number, out: PuffState & { stretch: number }) {
  const a = t - p.born;
  if (a <= 0) return false;
  const run = STAGE_STOP_S * (1 - Math.exp(-a / STAGE_STOP_S));
  out.x = p.x0 + p.vx * run;
  out.y = p.y0 + p.vy * run;
  out.z = p.z0 + p.vz * run;
  // Swelling fast as it slows, then slowly spreading.
  out.r = 3 + (p.r1 - 3) * (1 - Math.exp(-a / 0.6)) + 0.8 * a;
  // Stretched along the path to meet the rings before and after it, once
  // the air has stopped it (fresh out of the ring, each is its own puff).
  out.stretch = 1 + (THREE.MathUtils.clamp((1.2 * p.spacing) / out.r, 1, 3) - 1) * smooth((a - 0.4) / 1.2);
  // Thin: seen from the ground, a ring only a little brighter than the sky.
  const life = 1 - smooth((a - STAGE_LIFE_S[0]) / (STAGE_LIFE_S[1] - STAGE_LIFE_S[0]));
  out.tau = Math.min(0.45, 6 / out.r) * life;
  out.age = a;
  return out.tau > 0.002;
}

/**
 * Places `obj` in the trench frame at a pad: on the ground at (lat, lon),
 * +Y up, +X toward TRENCH_BEARING. Scale is left to the caller.
 */
export function padFrame(lat: number, lon: number, groundRadius: number, obj: THREE.Object3D) {
  const up = latLonToUnit(lat, lon);
  const step = 1e-4;
  const north = latLonToUnit(lat + step, lon).sub(up);
  north.addScaledVector(up, -north.dot(up)).normalize();
  const east = new THREE.Vector3().crossVectors(north, up).normalize();
  const b = THREE.MathUtils.degToRad(TRENCH_BEARING);
  const x = north.clone().multiplyScalar(Math.cos(b)).addScaledVector(east, Math.sin(b));
  const z = new THREE.Vector3().crossVectors(x, up);
  obj.position.copy(up).multiplyScalar(groundRadius);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, z));
  // East in this frame, for the wind.
  obj.userData.east = new THREE.Vector3(east.dot(x), 0, east.dot(z));
  return obj;
}

/**
 * A puff's lumps: its radius in the fragment shader is
 * r·(1 − LUMP_DENT·lumpy + lumpy·LUMP_AMP·(n1 + n2)), the noise 0..1; hot
 * staging's thin exhaust is smoother (STAGE_LUMPY). The square it is drawn on
 * covers the farthest its lumps reach, so no billow is cut off straight.
 */
const LUMP_DENT = 0.28;
const LUMP_AMP = 0.3;
const STAGE_LUMPY = 0.45;
const lumpReach = (lumpy: number) => 1 - LUMP_DENT * lumpy + 2 * LUMP_AMP * lumpy;
const glsl = (x: number) => x.toFixed(4);

const vertexShader = /* glsl */ `
  attribute vec4 aCentre; // x, y, z (m), radius (m)
  attribute vec4 aLook;   // optical depth, flame light 0..1, seed, kind
  attribute vec4 aSun;    // sunlight reaching it (linear), its shade 0..1
  attribute vec4 aAmb;    // sky light on it (linear), how stretched along aAxis
  attribute vec3 aAxis;
  uniform vec3 uEye;
  uniform vec3 uCamUp;
  uniform vec3 uCamRight;
  uniform vec3 uCamFwd;
  uniform float uNearM;
  varying vec3 vP;
  varying vec4 vC;
  varying vec4 vLook;
  varying vec4 vSun;
  varying vec4 vAmb;
  varying vec3 vAxis;
  void main() {
    vec3 c = aCentre.xyz;
    // The ball its lumps reach out to (radius times stretch, times the lumps' reach).
    float r = aCentre.w * aAmb.w * (aLook.w > 3.5 ? ${glsl(lumpReach(STAGE_LUMPY))} : ${glsl(lumpReach(1))});
    vec3 toC = c - uEye;
    float d = length(toC);
    // A square facing the eye, just in front of the puff (or of the camera,
    // when it is in the puff), big enough to cover all of it it sees.
    bool inside = d < r * 1.05;
    vec3 fwd = inside ? uCamFwd : toC / d;
    float p = max(d - r, 2.0 * uNearM);
    float hw = inside ? 8.0 * p : min(p * r / sqrt(d * d - r * r), 8.0 * p);
    vec3 right = cross(fwd, uCamUp);
    right = dot(right, right) < 1e-6 ? uCamRight : normalize(right);
    vec3 up = cross(right, fwd);
    // From the centre rather than the eye, which can be far away: no precision lost.
    vec3 corner = c + fwd * (p - d) + (right * position.x + up * position.y) * 2.04 * hw;
    if (inside) corner = uEye + fwd * p + (right * position.x + up * position.y) * 2.04 * hw;
    vP = corner;
    vC = aCentre;
    vLook = aLook;
    vSun = aSun;
    vAmb = aAmb;
    vAxis = aAxis;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(corner, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler3D;
  uniform vec3 uEye;
  uniform vec3 uSunL;
  uniform vec3 uFlame;
  uniform vec3 uFireNear;
  uniform vec3 uFireFar;
  uniform vec3 uFireTrail;
  uniform vec3 uGlowStage;
  uniform vec3 uGlowStageWarm;
  uniform float uSW;
  uniform float uNearM;
  uniform float uTime;
  uniform sampler3D uNoise;
  varying vec3 vP;
  varying vec4 vC;
  varying vec4 vLook;
  varying vec4 vSun;
  varying vec4 vAmb;
  varying vec3 vAxis;
  // The noise texture filtered smoothly (its trilinear filter alone leaves
  // creases, which show as facets on features a few texels across).
  float noise(vec3 p) {
    vec3 x = p * 32.0 - 0.5;
    vec3 i = floor(x);
    vec3 f = x - i;
    f = f * f * (3.0 - 2.0 * f);
    return texture(uNoise, (i + f + 0.5) / 32.0).r;
  }
  void main() {
    vec3 rd = normalize(vP - uEye);
    vec3 oc = vP - vC.xyz;
    // Into the puff's own space, where it is a ball: squashed along its axis.
    float k = 1.0 / vAmb.w;
    vec3 ocS = oc + dot(oc, vAxis) * (k - 1.0) * vAxis;
    vec3 rdS = rd + dot(rd, vAxis) * (k - 1.0) * vAxis;
    float A = dot(rdS, rdS);
    float B = dot(ocS, rdS);
    float m = -B / A; // where the line of sight passes closest to the centre, from vP
    float d2 = max(dot(ocS, ocS) - B * B / A, 0.0);
    // (Hot staging's thin exhaust is smoother.)
    float lumpy = vLook.w > 3.5 ? ${glsl(STAGE_LUMPY)} : 1.0;
    // Beyond the farthest its lumps reach (the square's corners): nothing to work out.
    float reach = vC.w * (1.0 - ${glsl(LUMP_DENT)} * lumpy + lumpy * ${glsl(2 * LUMP_AMP)});
    if (d2 >= reach * reach) discard;
    // A lumpy ball: its radius wobbles with direction (a few bulges, then
    // billows on them), slowly churning.
    vec3 q = (ocS + rdS * m) / vC.w;
    float seed = vLook.z * 17.0;
    float n1 = noise(q * 0.07 + seed + vec3(0.0, -uTime * 0.0006, 0.0));
    float n2 = noise(q * 0.3 + seed * 1.3 + vec3(uTime * 0.0008, 0.0, 0.0));
    float re = vC.w * (1.0 - ${glsl(LUMP_DENT)} * lumpy + lumpy * (${glsl(LUMP_AMP)} * n1 + ${glsl(LUMP_AMP)} * n2));
    if (d2 >= re * re) discard;
    float h = sqrt((re * re - d2) / A);
    float x0 = m - h;
    float x1 = m + h;
    // Only what is beyond the camera's near plane and above the ground.
    x0 = max(x0, uNearM - length(vP - uEye));
    if (rd.y < -1e-5) x1 = min(x1, -vP.y / rd.y);
    else if (rd.y > 1e-5) x0 = max(x0, -vP.y / rd.y);
    else if (vP.y < 0.0) discard;
    if (x1 <= x0) discard;
    // Steam along it, as a share of the amount straight across its middle:
    // half evenly spread, half densest in the middle (1 - (distance / radius)^2),
    // so a billow's edge is a soft rim, neither a hard line nor a haze.
    float a0 = x0 - m;
    float a1 = x1 - m;
    float inner = (x1 - x0) * (1.0 - d2 / (re * re)) - A * (a1 * a1 * a1 - a0 * a0 * a0) / (3.0 * re * re);
    float tau = vLook.x * (0.5 * (x1 - x0) / (2.0 * re) + 0.5 * inner / (1.3333 * re)) * (0.7 + 0.6 * n2);
    float alpha = 1.0 - exp(-tau);
    if (alpha < 0.003) discard;
    // Lit where the line of sight goes in, the surface roughened by the noise.
    vec3 peS = ocS + rdS * x0;
    float n3 = noise(q * 0.35 + seed * 0.7 + 0.5);
    vec3 nS = peS / re + 0.7 * (vec3(n1, n2, n3) - 0.5);
    vec3 nrm = normalize(nS + dot(nS, vAxis) * (k - 1.0) * vAxis);
    // Darker in the folds between billows.
    float folds = 0.8 + 0.2 * smoothstep(0.25, 0.75, 0.5 * n3 + 0.5 * n2);
    float wrap = clamp(dot(nrm, uSunL) * 0.65 + 0.35, 0.0, 1.0);
    float kind = vLook.w;
    float stage = step(3.5, kind);
    vec3 albedo = stage > 0.5 ? vec3(0.66, 0.63, 0.7) : kind < 0.5 ? vec3(0.86, 0.84, 0.81) : kind < 1.5 ? vec3(0.84, 0.77, 0.68) : vec3(0.88);
    vec3 col = albedo * folds * (uSW * vSun.rgb * (wrap * vSun.a + 0.06) + vAmb.rgb * (0.6 + 0.4 * nrm.y));
    // Thin edges toward the Sun glow with the light scattered forward through them.
    float g = 0.6;
    float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * dot(rd, uSunL), 1.5);
    col += uSW * vSun.rgb * vSun.a * 0.08 * hg * (1.0 - alpha);
    // The flame's light on the faces turned to it: yellow to orange on the
    // steam at the pad, pink inside the trail behind the plume. Hot staging's
    // exhaust glows by itself at first: orange, then peach.
    vec3 toFlame = normalize(uFlame - (vP + rd * x0));
    float facing = mix(clamp(dot(nrm, toFlame) * 0.6 + 0.4, 0.0, 1.0), 1.0, stage);
    vec3 fire = stage > 0.5 ? mix(uGlowStage, uGlowStageWarm, clamp((kind - 4.0) / 0.4, 0.0, 1.0)) : kind > 2.5 ? uFireTrail : mix(uFireFar, uFireNear, vLook.y);
    col += uSW * vLook.y * facing * fire;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * alpha, alpha);
  }
`;

/** The flame's light on the steam, sunlit-white units: about what launch photos at twilight show (docs/flames.md). */
const FIRE_SW = 0.06;
/**
 * How much brighter it is drawn in low light. The camera look keeps its
 * exposure close to daytime's, and the sky model's twilight and night are
 * drawn as an eye adapted to them sees them; the flame's light is raised to
 * match, so at dawn the cloud round the flame glows orange as it does in
 * photos, while by day it hardly shows (as in daytime photos).
 */
const FIRE_LOW_LIGHT = 12;
const FIRE_NEAR = unitLuminance(FLAME.fireSteam).multiplyScalar(FIRE_SW);
const FIRE_FAR = unitLuminance(FLAME.flare).multiplyScalar(FIRE_SW);
/** The plume's pink glow inside the trail right behind it (Flight 5 at T+79 s). */
const FIRE_TRAIL = unitLuminance(FLAME.pink20).multiplyScalar(FIRE_SW);
/** Hot staging's exhaust, glowing by itself as it leaves the ring (our estimate): peach, orange at first. */
const STAGE_GLOW_SW = 0.8;
const GLOW_STAGE = unitLuminance(FLAME.stagingCloud).multiplyScalar(STAGE_GLOW_SW);
const GLOW_STAGE_WARM = unitLuminance(FLAME.stagingOrange).multiplyScalar(STAGE_GLOW_SW);
/** At most this many staging puffs (buildStaging makes 13 rings of 18). */
const STAGE_MAX = 240;

export interface SteamFrame {
  /** Seconds since the engines lit (negative before). */
  t: number;
  camera: THREE.Camera;
  /** Unit vector to the Sun, scene frame. */
  sunDirection: THREE.Vector3;
  /** How bright the booster's flame is, 0..1. */
  flame: number;
  /** Where the booster's engines are (scene frame), which way it points (unit, toward its nose) and how long its plume is (m). */
  exits: THREE.Vector3;
  axis: THREE.Vector3;
  plumeLength: number;
}

export interface ExhaustCloud {
  /** Put this in the trench frame (padFrame), scaled to metres. */
  group: THREE.Group;
  update(f: SteamFrame): void;
  /** Dev: what was drawn last frame. */
  stats(): Record<string, unknown>;
  dispose(): void;
}

interface Draw {
  mesh: THREE.Mesh;
  centre: THREE.InstancedBufferAttribute;
  look: THREE.InstancedBufferAttribute;
  sun: THREE.InstancedBufferAttribute;
  amb: THREE.InstancedBufferAttribute;
  axis: THREE.InstancedBufferAttribute;
  geo: THREE.InstancedBufferGeometry;
}

/**
 * The steam cloud at the pad and the trail above it. `pathAt` gives where the
 * booster's engines are (scene frame) `t` s after ignition, for the trail;
 * false once that is no longer the climbing stack. `staging`: when the ship's
 * engines light (s after ignition), how far the booster's ring is above its
 * engines (m), and where the ring is at any moment (scene frame), for hot
 * staging's exhaust.
 */
export function makeExhaustCloud(pathAt?: (sinceIgnition: number, out: THREE.Vector3) => boolean, staging?: { at: number; ringAbove: number; ventsAt?: VentsAt }): ExhaustCloud {
  const puffs = PUFF_LIST;
  let trail: TrailPuff[] | null = null;
  let stage: StagePuff[] = [];
  const capacity = puffs.length + 400 + STAGE_MAX;
  const u = {
    uEye: { value: new THREE.Vector3() },
    uCamUp: { value: new THREE.Vector3(0, 1, 0) },
    uCamRight: { value: new THREE.Vector3(1, 0, 0) },
    uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
    uNearM: { value: 1 },
    uSunL: { value: new THREE.Vector3(0, 1, 0) },
    uFlame: { value: new THREE.Vector3(0, 10, 0) },
    uFireNear: { value: FIRE_NEAR.clone() },
    uFireFar: { value: FIRE_FAR.clone() },
    uFireTrail: { value: FIRE_TRAIL.clone() },
    uGlowStage: { value: GLOW_STAGE.clone() },
    uGlowStageWarm: { value: GLOW_STAGE_WARM.clone() },
    uSW: { value: SUNLIT_WHITE },
    uTime: { value: 0 },
    uNoise: { value: flameNoise() }
  };
  const material = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader,
    fragmentShader,
    // Premultiplied: the steam covers what is behind it by its alpha.
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const base = new THREE.PlaneGeometry(1, 1);
  const makeDraw = (order: number): Draw => {
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    const attr = (size: number) => new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(THREE.DynamicDrawUsage);
    const centre = attr(4), look = attr(4), sun = attr(4), amb = attr(4), axis = attr(3);
    geo.setAttribute('aCentre', centre);
    geo.setAttribute('aLook', look);
    geo.setAttribute('aSun', sun);
    geo.setAttribute('aAmb', amb);
    geo.setAttribute('aAxis', axis);
    geo.instanceCount = 0;
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    return { mesh, centre, look, sun, amb, axis, geo };
  };
  // Behind the flame (drawn before the plume, 5) and in front of it (after the nozzle glow, 6).
  const back = makeDraw(4);
  const front = makeDraw(7);
  const group = new THREE.Group();
  group.add(back.mesh, front.mesh);
  group.visible = false;

  // Per steam puff, this frame.
  const state = puffs.map(newPuffState);
  const live = new Uint8Array(puffs.length);
  const shade = new Float32Array(puffs.length).fill(1);
  // Per trail puff.
  const trailState: (PuffState & { stretch: number })[] = [];
  const trailLive: boolean[] = [];
  // Per staging puff.
  const stageState: (PuffState & { stretch: number })[] = [];
  const stageLive: boolean[] = [];
  // Everything drawn this frame: its distance, and which list and index.
  const dist = new Float32Array(capacity);
  const order: number[] = [];
  const sunRGB = [0, 0, 0];
  const sky = newSkyState();
  const zenith = [0, 0, 0];
  const amb = new THREE.Color();
  const inv = new THREE.Matrix4();
  const tmp = new THREE.Vector3();
  const exits = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const wind = { x: 0, z: 0 };
  let shadedAt = NaN;
  const shadedSun = new THREE.Vector3();
  /** Until then (s after ignition) the steam is shaded every frame: puffs are still being born and swell fast. */
  const SHADE_EVERY_FRAME_S = 15;

  /** How much each steam puff is shaded from the Sun by the others (crudely: the steam on a straight line toward the Sun). */
  function shadeFromSun(sunL: THREE.Vector3) {
    const n = puffs.length;
    for (let i = 0; i < n; i++) {
      if (!live[i]) continue;
      const a = state[i];
      let depth = 0;
      for (let j = 0; j < n; j++) {
        if (j === i || !live[j]) continue;
        const b = state[j];
        const ox = a.x - b.x, oy = a.y - b.y, oz = a.z - b.z;
        const along = ox * sunL.x + oy * sunL.y + oz * sunL.z;
        const o2 = ox * ox + oy * oy + oz * oz;
        if (along > 0 && o2 > b.r * b.r) continue; // behind, away from the Sun
        const miss = o2 - along * along;
        if (miss >= b.r * b.r) continue;
        depth += b.tau * Math.pow(1 - miss / (b.r * b.r), 1.5);
      }
      // Light scattered round inside the cloud keeps the shade from going black.
      shade[i] = 0.18 + 0.82 * Math.exp(-0.5 * depth);
    }
  }

  /** Distance (m) from point p to the plume: from the engines back along the axis, not below the ground. */
  const toPlume = (px: number, py: number, pz: number, length: number) => {
    const vx = px - exits.x, vy = py - exits.y, vz = pz - exits.z;
    let s = -(vx * axis.x + vy * axis.y + vz * axis.z);
    s = THREE.MathUtils.clamp(s, 0, length);
    const cx = exits.x - axis.x * s, cy = Math.max(0, exits.y - axis.y * s), cz = exits.z - axis.z * s;
    return Math.hypot(px - cx, py - cy, pz - cz);
  };

  /** Sun and sky on a puff `km` up, away from the ground's haze (the trail, hot staging's exhaust). */
  const lightHigh = (into: Draw, k: number, km: number, stretch: number) => {
    transmittance(u.uSunL.value.y, km, sunRGB);
    // Above the haze near the ground, sunlight crosses clean air, which
    // reddens it far less: keep about the share Rayleigh scattering alone takes (2/5).
    const clean = smooth((km - 2) / 6);
    for (let c = 0; c < 3; c++) sunRGB[c] = sunRGB[c] > 0 ? Math.pow(sunRGB[c], 1 - 0.6 * clean) : 0;
    into.sun.setXYZW(k, sunRGB[0], sunRGB[1], sunRGB[2], 1);
    // Less sky light up high (the sky above goes dark), some from the bright Earth below.
    const lit = 0.3 + 0.7 * skyLight(km, 1);
    into.amb.setXYZW(k, amb.r * lit, amb.g * lit, amb.b * lit, stretch);
  };

  return {
    group,
    update(f) {
      group.visible = f.t > -15 && f.t < 4000;
      if (!group.visible) return;
      group.updateWorldMatrix(true, false);
      inv.copy(group.matrixWorld).invert();
      const eye = u.uEye.value.copy(f.camera.position).applyMatrix4(inv);
      // From far off (orbit), there is nothing to see of it.
      if (eye.length() > 400000) {
        group.visible = false;
        return;
      }
      if (!trail) {
        const inFrame = (t: number, out: THREE.Vector3) => !!pathAt && pathAt(t, out) && !!out.applyMatrix4(inv);
        trail = pathAt ? buildTrail(inFrame) : [];
        for (let i = 0; i < trail.length && i < capacity - puffs.length - STAGE_MAX; i++) {
          trailState.push({ ...newPuffState(), stretch: 1 });
          trailLive.push(false);
        }
        const ventsAt = staging?.ventsAt;
        const ventsInFrame: VentsAt | undefined = ventsAt && ((t, centre, ax) => ventsAt(t, centre, ax) && !!centre.applyMatrix4(inv) && !!ax.transformDirection(inv));
        stage = pathAt && staging ? buildStaging(inFrame, staging.at, staging.ringAbove, ventsInFrame).slice(0, STAGE_MAX) : [];
        for (let i = 0; i < stage.length; i++) {
          stageState.push({ ...newPuffState(), stretch: 1 });
          stageLive.push(false);
        }
      }
      const cam = f.camera.matrixWorld.elements;
      u.uCamRight.value.set(cam[0], cam[1], cam[2]).transformDirection(inv);
      u.uCamUp.value.set(cam[4], cam[5], cam[6]).transformDirection(inv);
      u.uCamFwd.value.set(-cam[8], -cam[9], -cam[10]).transformDirection(inv);
      // The camera's near plane, in metres (this frame is scaled to metres).
      const scale = tmp.setFromMatrixScale(group.matrixWorld).x;
      u.uNearM.value = (f.camera as THREE.PerspectiveCamera).near / scale;
      u.uTime.value = f.t;
      const sunL = u.uSunL.value.copy(f.sunDirection).transformDirection(inv);
      exits.copy(f.exits).applyMatrix4(inv);
      axis.copy(f.axis).transformDirection(inv);

      // Daylight on the cloud: the sky round it (from the sky model at the
      // ground), a little bluer than grey where the Sun doesn't reach.
      skyAt(0, sunL.y, sky);
      radiance(sky.sat, column(1, 0), zenith);
      amb.setRGB(0.55 * zenith[0] + 0.45 * sky.horizon[0], 0.55 * zenith[1] + 0.45 * sky.horizon[1], 0.55 * zenith[2] + 0.45 * sky.horizon[2]);
      const grey = 0.2126 * amb.r + 0.7152 * amb.g + 0.0722 * amb.b;
      amb.setRGB(grey + 0.6 * (amb.r - grey), grey + 0.6 * (amb.g - grey), grey + 0.6 * (amb.b - grey)).multiplyScalar(0.85);
      amb.r += 0.002;
      amb.g += 0.002;
      amb.b += 0.0025;
      const fireGain = 1 + (FIRE_LOW_LIGHT - 1) * (1 - sky.day);
      u.uFireNear.value.copy(FIRE_NEAR).multiplyScalar(fireGain);
      u.uFireFar.value.copy(FIRE_FAR).multiplyScalar(fireGain);
      u.uFireTrail.value.copy(FIRE_TRAIL).multiplyScalar(fireGain);

      const east = (group.parent?.userData.east as THREE.Vector3 | undefined) ?? tmp.set(1, 0, 0);
      const top = Math.max(0, exits.y);
      const length = Math.max(1, f.plumeLength);
      // The flame's light comes from its lowest 60 m or so above the ground.
      u.uFlame.value.copy(exits).addScaledVector(axis, -Math.min(length, 60) * 0.5);
      u.uFlame.value.y = Math.max(u.uFlame.value.y, 2);
      // While the flame is in the trench, fire comes out of both ends of it.
      const inTrench = f.flame * (1 - smooth((top - 20) / 60));
      const n = puffs.length;
      let appeared = false;
      for (let i = 0; i < n; i++) {
        const s = state[i];
        const was = live[i];
        live[i] = puffAt(puffs[i], f.t, east.x, east.z, s) ? 1 : 0;
        if (live[i] !== was) appeared = true;
        if (live[i]) dist[i] = Math.hypot(s.x - eye.x, s.y - eye.y, s.z - eye.z);
      }
      for (let i = 0; i < trailState.length; i++) {
        const s = trailState[i];
        trailLive[i] = trailAt(trail[i], f.t, east, s, wind);
        if (trailLive[i]) dist[n + i] = Math.hypot(s.x - eye.x, s.y - eye.y, s.z - eye.z);
      }
      const nt = n + trailState.length;
      for (let i = 0; i < stageState.length; i++) {
        const s = stageState[i];
        stageLive[i] = stageAt(stage[i], f.t, s);
        if (stageLive[i]) dist[nt + i] = Math.hypot(s.x - eye.x, s.y - eye.y, s.z - eye.z);
      }
      // Re-shade the steam every frame while it is born and billows fast, then
      // when time or the Sun has moved on, or a puff has come or gone: the same
      // moment is shaded the same however it was reached.
      if (f.t < SHADE_EVERY_FRAME_S || appeared || !(Math.abs(f.t - shadedAt) < 0.2) || shadedSun.dot(sunL) < 0.99999) {
        shadeFromSun(sunL);
        shadedAt = f.t;
        shadedSun.copy(sunL);
      }

      // Back to front; split at the flame.
      order.length = 0;
      for (let i = 0; i < n; i++) if (live[i]) order.push(i);
      for (let i = 0; i < trailState.length; i++) if (trailLive[i]) order.push(n + i);
      for (let i = 0; i < stageState.length; i++) if (stageLive[i]) order.push(nt + i);
      order.sort((a, b) => dist[b] - dist[a]);
      const flameDist = f.flame > 0.01 ? toPlume(eye.x, eye.y, eye.z, length) : -1;
      back.geo.instanceCount = 0;
      front.geo.instanceCount = 0;
      for (const j of order) {
        const into = dist[j] > flameDist ? back : front;
        const k = into.geo.instanceCount++;
        if (j < n) {
          const p = puffs[j], s = state[j];
          into.centre.setXYZW(k, s.x, s.y, s.z, s.r);
          // The flame's light: strongest on puffs next to it, and on fresh fire out of the trench.
          const gap = Math.max(0, toPlume(s.x, s.y, s.z, length) - s.r);
          const fresh = p.kind === Kind.Jet ? inTrench * Math.exp(-s.age / 1.2) : 0;
          into.look.setXYZW(k, s.tau, Math.min(1, f.flame * Math.exp(-gap / 50) + fresh), p.seed, p.kind);
          transmittance(sunL.y, s.y / 1000, sunRGB);
          into.sun.setXYZW(k, sunRGB[0], sunRGB[1], sunRGB[2], shade[j]);
          into.amb.setXYZW(k, amb.r, amb.g, amb.b, 1);
          into.axis.setXYZ(k, 0, 1, 0);
        } else if (j < nt) {
          const p = trail![j - n], s = trailState[j - n];
          into.centre.setXYZW(k, s.x, s.y, s.z, s.r);
          const gap = Math.max(0, Math.hypot(s.x - exits.x, s.y - exits.y, s.z - exits.z) - s.r);
          into.look.setXYZW(k, s.tau, f.flame * 0.6 * Math.exp(-gap / 100), p.seed, Kind.Trail);
          lightHigh(into, k, s.y / 1000, s.stretch);
          into.axis.setXYZ(k, p.ax, p.ay, p.az);
        } else {
          const p = stage[j - nt], s = stageState[j - nt];
          into.centre.setXYZW(k, s.x, s.y, s.z, s.r);
          // Its own glow, gone as it cools within a fraction of a second.
          into.look.setXYZW(k, s.tau, p.glow * Math.exp(-s.age / 0.3), p.seed, Kind.Stage + 0.4 * p.warm);
          lightHigh(into, k, s.y / 1000, s.stretch);
          into.axis.setXYZ(k, p.ax, p.ay, p.az);
        }
      }
      for (const d of [back, front]) {
        d.mesh.visible = d.geo.instanceCount > 0;
        for (const a of [d.centre, d.look, d.sun, d.amb, d.axis]) {
          a.needsUpdate = true;
          a.clearUpdateRanges();
          a.addUpdateRange(0, d.geo.instanceCount * a.itemSize);
        }
      }
    },
    stats() {
      let nearest = { d: Infinity, r: 0, tau: 0, km: 0 };
      trailState.forEach((s, i) => {
        if (!trailLive[i]) return;
        const d = Math.hypot(s.x - u.uEye.value.x, s.y - u.uEye.value.y, s.z - u.uEye.value.z);
        if (d < nearest.d) nearest = { d: Math.round(d), r: Math.round(s.r), tau: +s.tau.toFixed(2), km: +(s.y / 1000).toFixed(1) };
      });
      return {
        visible: group.visible,
        back: back.geo.instanceCount,
        front: front.geo.instanceCount,
        trail: trail?.length ?? 0,
        trailLive: trailLive.filter(Boolean).length,
        stage: stage.length,
        stageLive: stageLive.filter(Boolean).length,
        eye: u.uEye.value.toArray().map(Math.round),
        nearestTrail: nearest
      };
    },
    dispose() {
      base.dispose();
      back.geo.dispose();
      front.geo.dispose();
      material.dispose();
    }
  };
}
