import * as THREE from 'three';

// Scene frame: Earth-fixed, Y = north pole, X = (0°N, 0°E), Z = (0°N, 90°W).
// This is ECEF (X, Y, Z) mapped to three.js as (X, Z, -Y), i.e. ECEF rotated
// -90° about X. One scene unit = one mean Earth radius.

export const EARTH_RADIUS_KM = 6371;
export const KM = 1 / EARTH_RADIUS_KM; // scene units per km

const D2R = Math.PI / 180;

// WGS84, the shape the globe and its map tiles are drawn on (km).
const WGS84_A = 6378.137;
const WGS84_B = 6356.752314245;
/** b²/a², or 1 − e². */
const FLAT = (WGS84_B * WGS84_B) / (WGS84_A * WGS84_A);

/**
 * Map latitude and longitude (WGS84 geodetic: what the map tiles, GPS and our
 * data use) → unit direction from the Earth's centre to that place on the
 * ground. On the flattened Earth that direction is a little nearer the equator
 * than the map latitude (up to 0.19°, about 21 km, at 45°), so this converts.
 */
export function latLonToUnit(lat: number, lon: number, out = new THREE.Vector3()) {
  return sphericalToUnit(geocentricLatitude(lat), lon, out);
}

/** The inverse: the map latitude and longitude of the ground straight below `v` (towards the Earth's centre). */
export function unitToLatLon(v: THREE.Vector3) {
  return {
    lat: Math.atan2(v.y, FLAT * Math.hypot(v.x, v.z)) / D2R,
    lon: Math.atan2(-v.z, v.x) / D2R
  };
}

/** Local vertical at scene point `v` (on or near the ground): the WGS84 ellipsoid's normal, the way a plumb line hangs. */
export function ellipsoidNormal(v: THREE.Vector3, out = new THREE.Vector3()) {
  return out.set(v.x, v.y / FLAT, v.z).normalize();
}

/**
 * Plain spherical latitude and longitude → unit direction, no Earth shape: for
 * directions in the sky (a body's declination), or a latitude already
 * geocentric. Map coordinates go through latLonToUnit.
 */
export function sphericalToUnit(lat: number, lon: number, out = new THREE.Vector3()) {
  const phi = lat * D2R;
  const lam = lon * D2R;
  const c = Math.cos(phi);
  return out.set(c * Math.cos(lam), Math.sin(phi), -c * Math.sin(lam));
}

/** Map (geodetic) latitude → the latitude of the direction from the Earth's centre to that place (geocentric), degrees. */
export function geocentricLatitude(geodeticDeg: number): number {
  const p = geodeticDeg * D2R;
  return Math.atan2(FLAT * Math.sin(p), Math.cos(p)) / D2R;
}

/** WGS84 surface radius along a direction from the centre with geocentric latitude `latDeg`, in mean Earth radii. */
export function surfaceRadiusGeocentric(latDeg: number): number {
  const p = latDeg * D2R;
  return (WGS84_A * WGS84_B) / Math.hypot(WGS84_B * Math.cos(p), WGS84_A * Math.sin(p)) / EARTH_RADIUS_KM;
}

/** WGS84 surface radius at a map (geodetic) latitude, in mean Earth radii: latLonToUnit(lat, lon) × this is the ground point. */
export function ellipsoidRadius(latDeg: number): number {
  const a = WGS84_A;
  const b = WGS84_B;
  const p = latDeg * D2R;
  const c = Math.cos(p);
  const s = Math.sin(p);
  return Math.sqrt(((a * a * c) ** 2 + (b * b * s) ** 2) / ((a * c) ** 2 + (b * s) ** 2)) / EARTH_RADIUS_KM;
}
