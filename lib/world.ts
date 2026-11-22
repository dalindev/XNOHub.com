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
