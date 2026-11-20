import * as THREE from 'three';
import { SiderealTime, MakeTime } from 'astronomy-engine';
import { EARTH_RADIUS_KM } from '@/lib/geo';

// Satellite positions from compact mean elements (see scripts/build-starlink.mjs).
// Circular orbit + J2 secular drift: Starlink eccentricity is ~1e-4, so this
// stays within ~10–20 km of SGP4 for a day or two, plenty for drawing and for
// latency estimates, and it's cheap enough to run on the GPU for ~11,000
// satellites every frame (ORBIT_GLSL below is the same maths).

export const MU = 398600.4418; // km^3/s^2

/** [noradId, version, a km, inc, raan, u, n rad/s, raanDot rad/s] at the file's epoch */
export type SatRow = [number, number, number, number, number, number, number, number];

export interface StarlinkFile {
  generatedAt: string;
  source: string;
  epoch: string;
  sats: SatRow[];
  links: [number, number][];
}

export const VERSION_NAMES = ['V1.0', 'V1.5', 'V2 Mini', 'V3'] as const;

/** Inertial (TEME-like) position in km, `dt` seconds after the file epoch. */
export function eciAt(row: SatRow, dt: number, out: number[] | Float32Array = [0, 0, 0], o = 0) {
  const [, , a, inc, raan0, u0, n, raanDot] = row;
  const u = u0 + n * dt;
  const raan = raan0 + raanDot * dt;
  const cu = Math.cos(u), su = Math.sin(u), cO = Math.cos(raan), sO = Math.sin(raan), ci = Math.cos(inc), si = Math.sin(inc);
  out[o] = a * (cO * cu - sO * su * ci);
  out[o + 1] = a * (sO * cu + cO * su * ci);
  out[o + 2] = a * su * si;
  return out;
}

/** Greenwich sidereal angle (rad) for a date. */
export const siderealAngle = (date: Date) => (SiderealTime(MakeTime(date)) / 24) * 2 * Math.PI;

/** Inertial km → scene frame (Earth-fixed, Y north, Earth radii). */
export function eciToScene(x: number, y: number, z: number, gst: number, out = new THREE.Vector3()) {
  const c = Math.cos(gst), s = Math.sin(gst);
  const xe = x * c + y * s;
  const ye = -x * s + y * c;
  return out.set(xe, z, -ye).multiplyScalar(1 / EARTH_RADIUS_KM);
}

/** Orbital period in minutes. */
export const periodMinutes = (row: SatRow) => (2 * Math.PI) / row[6] / 60;

// GLSL twin of eciAt + eciToScene. Attributes: aOrbit = (a km, inc, raan0, u0),
// aRates = (n, raanDot). Uniforms: uDt (s since epoch), uGst (rad).
export const ORBIT_GLSL = /* glsl */ `
  uniform float uDt;
  uniform float uGst;
  vec3 orbitScene(vec4 orbit, vec2 rates) {
    float u = orbit.w + rates.x * uDt;
    float raan = orbit.z + rates.y * uDt;
    float cu = cos(u), su = sin(u), cO = cos(raan), sO = sin(raan), ci = cos(orbit.y), si = sin(orbit.y);
    vec3 eci = orbit.x * vec3(cO * cu - sO * su * ci, sO * cu + cO * su * ci, su * si);
    float c = cos(uGst), s = sin(uGst);
    float xe = eci.x * c + eci.y * s;
    float ye = -eci.x * s + eci.y * c;
    return vec3(xe, eci.z, -ye) / ${EARTH_RADIUS_KM.toFixed(1)};
  }
`;

// Float32 on the GPU loses precision once n·dt gets large (days of time warp),
// so the CPU re-bases: every REBASE_S of sim time it advances each row's
// angles to "now" and the shader's dt starts again from 0.
export const REBASE_S = 6 * 3600;

/** Advance every row's angles by dt seconds (in place), wrapping to [0, 2π). */
export function rebaseRows(rows: SatRow[], dt: number) {
  const TAU = Math.PI * 2;
  for (const r of rows) {
    r[5] = (((r[5] + r[6] * dt) % TAU) + TAU) % TAU;
    r[4] = (((r[4] + r[7] * dt) % TAU) + TAU) % TAU;
  }
}
