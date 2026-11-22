import * as THREE from 'three';

// Where meteors burn, in the scene's units (1 = 6,371 km, the Earth at the
// origin). A grain of dust or a pebble arriving at 11 to 72 km/s starts to glow
// about 120 km up and is gone by 70 to 90 km; a bigger one (a fireball) gets
// lower. An earthgrazer comes in so flat that it skims the upper air and leaves
// again, glowing along a thousand kilometres or more.

export const KM = 1 / 6371;
export const GLOW_FROM_KM = 120;

export interface MeteorPath {
  start: THREE.Vector3;
  dir: THREE.Vector3; // unit
  length: number; // scene units
}

export const altitudeKm = (p: THREE.Vector3) => (p.length() - 1) / KM;

/** Any unit vector at right angles to `up`, turned by `heading` radians round it. */
export function tangent(up: THREE.Vector3, heading: number, out = new THREE.Vector3()) {
  const a = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const east = new THREE.Vector3().crossVectors(a, up).normalize();
  const north = new THREE.Vector3().crossVectors(up, east);
  return out.copy(east).multiplyScalar(Math.cos(heading)).addScaledVector(north, Math.sin(heading));
}

/**
 * A meteor that starts to glow 120 km above `over` (a unit vector), heads
 * `heading` and comes down `dropKm` along a path `lengthKm` long.
 */
export function meteorPath(over: THREE.Vector3, heading: number, lengthKm: number, dropKm: number): MeteorPath {
  const sin = Math.min(0.97, dropKm / lengthKm);
  const dir = tangent(over, heading).multiplyScalar(Math.sqrt(1 - sin * sin)).addScaledVector(over, -sin).normalize();
  return { start: over.clone().multiplyScalar(1 + GLOW_FROM_KM * KM), dir, length: lengthKm * KM };
}

/** A meteor arriving along `dir` (a shower: all of them parallel) that starts to glow above `over`. Null where `dir` doesn't point down enough. */
export function showerPath(over: THREE.Vector3, dir: THREE.Vector3, dropKm: number, maxLengthKm: number): MeteorPath | null {
  const sin = -over.dot(dir);
  if (sin < 0.12) return null;
  return { start: over.clone().multiplyScalar(1 + GLOW_FROM_KM * KM), dir: dir.clone(), length: Math.min(maxLengthKm, dropKm / sin) * KM };
}

/** An earthgrazer: passes `lowestKm` above `over` going `heading`, glowing while it is below 125 km. */
export function grazerPath(over: THREE.Vector3, heading: number, lowestKm: number): MeteorPath {
  const dir = tangent(over, heading);
  const low = 1 + lowestKm * KM;
  const top = 1 + 125 * KM;
  const half = Math.sqrt(top * top - low * low);
  return { start: over.clone().multiplyScalar(low).addScaledVector(dir, -half), dir, length: 2 * half };
}
