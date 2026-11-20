import * as THREE from 'three';

// Scene frame: Earth-fixed, Y = north pole, X = (0°N, 0°E), Z = (0°N, 90°W).
// This is ECEF (X, Y, Z) mapped to three.js as (X, Z, -Y), i.e. ECEF rotated
// -90° about X. One scene unit = one mean Earth radius.

export const EARTH_RADIUS_KM = 6371;
export const KM = 1 / EARTH_RADIUS_KM; // scene units per km

const D2R = Math.PI / 180;

export function latLonToUnit(lat: number, lon: number, out = new THREE.Vector3()) {
  const phi = lat * D2R;
  const lam = lon * D2R;
  const c = Math.cos(phi);
  return out.set(c * Math.cos(lam), Math.sin(phi), -c * Math.sin(lam));
}

export function unitToLatLon(v: THREE.Vector3) {
  const n = v.clone().normalize();
  return {
    lat: Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)) / D2R,
    lon: Math.atan2(-n.z, n.x) / D2R
  };
}
