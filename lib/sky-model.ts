import * as THREE from 'three';
import { EARTH_RADIUS_KM } from '@/lib/geo';

// The daytime sky seen from inside the air, at any height: a thin column of
// air that thins out with height (8 km scale height) and scatters blue the
// most. Looking up from the ground the whole column glows; from 27 km only
// about 3% of it is left overhead, so the zenith goes navy over a bright band
// along the horizon, where a line of sight still crosses a lot of air; by
// 40 km the zenith is near-black; above 90 km nothing is left but the limb
// glow drawn from outside (components/sky).
//
// Radiance along a view ray: L = sat * (1 - exp(-K * C)), where C is the air
// the ray crosses in units of one vertical column at sea level (air mass), K
// how much of the light one column scatters per channel, and sat the colour
// a very long path saturates at (blue by day, warm at dusk). The same numbers
// drive the shader through SKY_GLSL.

export const SCALE_HEIGHT_KM = 8;
/** Optical depth per air mass, linear RGB: a Rayleigh-like spread toward blue. */
export const SKY_K = [0.163, 0.423, 1.61] as const;
/** Linear colour a very long path through the day sky saturates at. */
export const DAY_SAT = [0.4, 0.55, 0.8] as const;
/** The same at sunrise and sunset. */
export const DUSK_SAT = [0.55, 0.32, 0.22] as const;
/** The dome fades out between these heights (km), handing over to the limb glow. */
export const DOME_FADE_KM = [60, 90] as const;

const smooth = THREE.MathUtils.smoothstep;

/** Kasten–Young air mass for a ray `mu` (cos of its angle from straight up) above the horizon. */
export function airmass(mu: number) {
  const m = THREE.MathUtils.clamp(mu, 0, 1);
  const z = THREE.MathUtils.radToDeg(Math.acos(m));
  return 1 / (m + 0.50572 * Math.pow(96.07995 - z, -1.6364));
}

/** Air mass of a horizontal ray from sea level, about 37.9. */
export const X_HORIZON = airmass(0);

/**
 * Air a ray from `hKm` up crosses, in air masses, for `mu` the cos of its
 * angle from straight up. Below the horizon (mu < 0) it dips to a tangent
 * height and climbs out again: the full tangent line, less the part behind
 * the camera. A ray into the ground has no real value: this gives a large one
 * (more than at the limb), where the sky's colour has long saturated and the
 * ground covers it anyway; transmittance() treats such rays as blocked.
 */
export function column(mu: number, hKm: number) {
  const h = Math.max(0, hKm);
  const above = Math.exp(-h / SCALE_HEIGHT_KM);
  if (mu >= 0) return above * airmass(mu);
  const mu2 = mu * mu;
  // (R + h)·sin(angle) − R, written so it doesn't cancel near the horizon.
  const t = Math.max(h - ((EARTH_RADIUS_KM + h) * mu2) / (1 + Math.sqrt(1 - mu2)), 0);
  return 2 * X_HORIZON * Math.exp(-t / SCALE_HEIGHT_KM) - above * airmass(-mu);
}

/**
 * How much a beam (the Sun, the Moon) dims per air mass, linear RGB: Rayleigh
 * scattering plus a clear day's haze. Near white overhead, orange 10° up, a
 * dim red at the horizon. (SKY_K sets how fast the sky's glow saturates, not
 * how much a beam dims.)
 */
export const EXTINCTION = [0.16, 0.21, 0.33] as const;

/** Share of a beam that reaches `hKm` along `mu` (cos from straight up), linear RGB; 0 behind the Earth. */
export function transmittance(mu: number, hKm: number, out: number[] = [0, 0, 0]) {
  const h = Math.max(0, hKm);
  const grazing = -Math.sqrt(Math.max(0, 1 - (EARTH_RADIUS_KM / (EARTH_RADIUS_KM + h)) ** 2));
  const c = mu < grazing ? Infinity : column(mu, h);
  for (let i = 0; i < 3; i++) out[i] = Math.exp(-EXTINCTION[i] * c);
  return out;
}

/** Linear radiance of a ray crossing `c` air masses toward a sky that saturates at `sat`. */
export function radiance(sat: ArrayLike<number>, c: number, out: number[] = [0, 0, 0]) {
  for (let i = 0; i < 3; i++) out[i] = sat[i] * (1 - Math.exp(-SKY_K[i] * c));
  return out;
}

/** How much of the dome is drawn at `hKm`: 1 below 60 km, 0 above 90. */
export const domeWeight = (hKm: number) => 1 - smooth(hKm, DOME_FADE_KM[0], DOME_FADE_KM[1]);

const FULL_SKY = 1 - Math.exp(-SKY_K[1] * X_HORIZON);

/**
 * How bright the sky round the camera is, 0..1: the share of the sea-level
 * horizon's brightness left at `hKm` (1 at the ground, 0.42 at 27 km, 0.10
 * at 40 km), times daylight. Hides the stars and the meteors by day.
 */
export const skyLight = (hKm: number, day: number) =>
  (day * domeWeight(hKm) * (1 - Math.exp(-SKY_K[1] * X_HORIZON * Math.exp(-Math.max(0, hKm) / SCALE_HEIGHT_KM)))) / FULL_SKY;

export interface SkyState {
  /** Daylight 0..1, from the Sun's elevation. */
  day: number;
  /** Sunrise or sunset glow 0..0.6. */
  dusk: number;
  /** domeWeight at this height. */
  weight: number;
  /** skyLight at this height and time. */
  light: number;
  /** Colour the sky saturates at, linear. */
  sat: [number, number, number];
  /** Colour along the horizon, which the haze takes, linear. */
  horizon: [number, number, number];
}

export const newSkyState = (): SkyState => ({ day: 0, dusk: 0, weight: 0, light: 0, sat: [0, 0, 0], horizon: [0, 0, 0] });

/** The sky at `hKm` with the Sun at `sinEl` (sin of its elevation), into `out` without allocating. */
export function skyAt(hKm: number, sinEl: number, out: SkyState) {
  const day = smooth(sinEl, -0.1, 0.25);
  const dusk = Math.max(0, 1 - Math.abs(sinEl) / 0.15) * 0.6;
  out.day = day;
  out.dusk = dusk;
  out.weight = domeWeight(hKm);
  out.light = skyLight(hKm, day);
  for (let i = 0; i < 3; i++) {
    out.sat[i] = DUSK_SAT[i] * dusk * (1 - day) + DAY_SAT[i] * day;
    out.horizon[i] = out.sat[i] * (1 - Math.exp(-SKY_K[i] * X_HORIZON));
  }
  return out;
}

const f = (x: number) => x.toFixed(6);

/** The column maths above in GLSL, from the same constants. */
export const SKY_GLSL = /* glsl */ `
const float SKY_H = ${f(SCALE_HEIGHT_KM)};
const float SKY_R = ${f(EARTH_RADIUS_KM)};
const float SKY_XH = ${f(X_HORIZON)};
const vec3 SKY_K = vec3(${SKY_K.map(f).join(', ')});
float skyAirmass(float mu) {
  float m = clamp(mu, 0.0, 1.0);
  float z = degrees(acos(m));
  return 1.0 / (m + 0.50572 * pow(96.07995 - z, -1.6364));
}
float skyColumn(float mu, float h) {
  float above = exp(-h / SKY_H);
  if (mu >= 0.0) return above * skyAirmass(mu);
  float mu2 = mu * mu;
  float t = max(h - (SKY_R + h) * mu2 / (1.0 + sqrt(1.0 - mu2)), 0.0);
  return 2.0 * SKY_XH * exp(-t / SKY_H) - above * skyAirmass(-mu);
}
`;
