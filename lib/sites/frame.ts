import * as THREE from 'three';
import { EARTH_RADIUS_KM } from '@/lib/geo';

/**
 * A local frame on the ground for a site a few kilometres across: metres,
 * X east, Y up (the WGS84 ellipsoid's normal, the way a plumb line hangs),
 * Z south. Over 1.5 km the Earth's curve drops under 0.2 m, so one flat frame
 * is enough. Positions are given as (E, N) metres east and north of the origin.
 */

const D2R = Math.PI / 180;
const A_M = 6_378_137;
const B_M = 6_356_752.314245;
const E2 = 1 - (B_M * B_M) / (A_M * A_M);
const UNIT_M = EARTH_RADIUS_KM * 1000;

/** Map latitude, longitude (WGS84) and height above the ellipsoid (m) → scene point (Earth radii). */
export function geodeticToScene(lat: number, lon: number, hM: number, out = new THREE.Vector3()) {
  const p = lat * D2R, l = lon * D2R;
  const sp = Math.sin(p), cp = Math.cos(p);
  const n = A_M / Math.sqrt(1 - E2 * sp * sp);
  const x = (n + hM) * cp * Math.cos(l);
  const y = (n + hM) * cp * Math.sin(l);
  const z = (n * (1 - E2) + hM) * sp;
  // ECEF (x, y, z) → scene (x, z, −y), see lib/geo.ts.
  return out.set(x / UNIT_M, z / UNIT_M, -y / UNIT_M);
}

export interface SiteFrame {
  lat: number;
  lon: number;
  /** Height of the frame's origin above the ellipsoid (m). */
  hM: number;
  origin: THREE.Vector3;
  east: THREE.Vector3;
  north: THREE.Vector3;
  /** The ellipsoid normal: local vertical. */
  up: THREE.Vector3;
  /** Local metres (X east, Y up, Z south) → scene. */
  matrix: THREE.Matrix4;
  quaternion: THREE.Quaternion;
}

/** The frame on the ellipsoid at (lat, lon), raised `hM` metres along its normal. */
export function siteFrame(lat: number, lon: number, hM = 0): SiteFrame {
  const p = lat * D2R, l = lon * D2R;
  const east = new THREE.Vector3(-Math.sin(l), 0, -Math.cos(l));
  const north = new THREE.Vector3(-Math.sin(p) * Math.cos(l), Math.cos(p), Math.sin(p) * Math.sin(l));
  const up = new THREE.Vector3(Math.cos(p) * Math.cos(l), Math.sin(p), -Math.cos(p) * Math.sin(l));
  const south = north.clone().negate();
  const origin = geodeticToScene(lat, lon, hM);
  const basis = new THREE.Matrix4().makeBasis(east, up, south);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
  const s = 1 / UNIT_M;
  const matrix = new THREE.Matrix4().compose(origin, quaternion, new THREE.Vector3(s, s, s));
  return { lat, lon, hM, origin, east, north, up, matrix, quaternion };
}

/** (E, N, U) metres in the frame → scene point. */
export function enuToScene(f: SiteFrame, e: number, n: number, u: number, out = new THREE.Vector3()) {
  return out.set(e, u, -n).applyMatrix4(f.matrix);
}

/** Scene point → (E, N, U) metres in the frame. */
export function sceneToEnu(f: SiteFrame, v: THREE.Vector3, out = new THREE.Vector3()) {
  const d = v.clone().sub(f.origin).multiplyScalar(UNIT_M);
  return out.set(d.dot(f.east), d.dot(f.north), d.dot(f.up));
}

/** A horizontal direction in the frame's local axes (X east, Z south) for a bearing in degrees clockwise from north. */
export function bearingDir(deg: number, out = new THREE.Vector3()) {
  const b = deg * D2R;
  return out.set(Math.sin(b), 0, -Math.cos(b));
}

/** Local (X, Z) of a point given as (E, N) metres: X = E, Z = −N. */
export const local = (e: number, n: number): [number, number] => [e, -n];

/** Yaw (radians about local +Y) that turns local +X to face `bearing` degrees. */
export const yawFor = (bearing: number) => (90 - bearing) * D2R;

/** Exact (E, N) of a map point in the frame, from an exact conversion (not a flat-map shortcut). */
export function latLonToEnu(f: SiteFrame, lat: number, lon: number, hM = f.hM) {
  const v = sceneToEnu(f, geodeticToScene(lat, lon, hM));
  return { e: v.x, n: v.y, u: v.z };
}
