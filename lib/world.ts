import * as THREE from 'three';

// Shared, non-React world state read inside useFrame. One writer per field.

export const world = {
  /** Camera height above the ground (or the sea) under it, in Earth radii. Written by WorldWatcher. */
  altitude: 3,
  /** Ground height under the camera in Earth radii (from loaded terrain), or null. */
  groundAltitude: null as number | null,
  /** Unit vector from the Earth's centre to the Sun, scene frame. Written by Sky. */
  sunDirection: new THREE.Vector3(1, 0, 0),
  /** How big the Earth looks: its radius on screen, in CSS pixels. Written by WorldWatcher. */
  earthPx: 220,
  /** Near plane forced by a close-up chase view (metres-scale models), or null. */
  nearOverride: null as number | null,
  /** Pose for the next free flight, set by deep links; consumed by FlyControls. */
  flyStart: null as null | { lat: number; lon: number; altKm: number; heading: number; pitch: number }
};

/**
 * How much to shrink markers drawn a fixed size on screen (the node pads and
 * dots), so they keep their size next to the Earth when the camera pulls back
 * instead of growing bigger than it: 1 at the home view (the Earth about 220 px
 * across its radius), smaller as the Earth gets smaller.
 */
export const markerScale = () => Math.min(1, Math.max(0.15, world.earthPx / 220));

/**
 * Deep link: ?fly=lat,lon,altKm[,headingDeg,pitchDeg]&time=ISO-8601
 * e.g. ?fly=45.98,7.66,8,200,-15&time=2026-11-20T12:00Z (Matterhorn at noon)
 */
export function parseDeepLink(search: string) {
  const q = new URLSearchParams(search);
  const out: { fly?: NonNullable<typeof world.flyStart>; timeMs?: number } = {};
  const fly = q.get('fly')?.split(',').map(Number);
  if (fly && fly.length >= 3 && fly.slice(0, 3).every(Number.isFinite)) {
    const [lat, lon, altKm, heading = 0, pitch = -20] = fly;
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && altKm > 0) {
      out.fly = { lat, lon, altKm, heading, pitch };
    }
  }
  const t = q.get('time');
  if (t) {
    const ms = Date.parse(t);
    if (Number.isFinite(ms)) out.timeMs = ms;
  }
  return out;
}

const WGS84_A = 6378.137;
const WGS84_B = 6356.752;

/**
 * The map tiles are laid out by geodetic latitude (the usual map kind); a
 * direction from the Earth's centre has a geocentric one, a little nearer
 * the equator (0.15 degrees, about 16 km, at Starbase). Converts geodetic
 * to geocentric, for placing something exactly on the tiles.
 */
export function geocentricLatitude(geodeticDeg: number): number {
  const p = (geodeticDeg * Math.PI) / 180;
  return (Math.atan(((WGS84_B * WGS84_B) / (WGS84_A * WGS84_A)) * Math.tan(p)) * 180) / Math.PI;
}

/** WGS84 surface radius along a direction from the centre with geocentric latitude `latDeg`, in mean Earth radii. */
export function surfaceRadiusGeocentric(latDeg: number): number {
  const p = (latDeg * Math.PI) / 180;
  return (WGS84_A * WGS84_B) / Math.hypot(WGS84_B * Math.cos(p), WGS84_A * Math.sin(p)) / 6371;
}

/**
 * WGS84 surface radius at a geodetic latitude, in mean Earth radii. (Given a
 * geocentric latitude instead, it is up to ~100 m out at mid latitudes: fine
 * for markers, not for something sitting on the ground; see
 * surfaceRadiusGeocentric.)
 */
export function ellipsoidRadius(latDeg: number): number {
  const a = 6378.137;
  const b = 6356.752;
  const p = (latDeg * Math.PI) / 180;
  const c = Math.cos(p);
  const s = Math.sin(p);
  const r = Math.sqrt(((a * a * c) ** 2 + (b * b * s) ** 2) / ((a * c) ** 2 + (b * s) ** 2));
  return r / 6371;
}
