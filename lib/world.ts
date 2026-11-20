// Shared, non-React world state read inside useFrame. One writer per field.

export const TILES_BELOW = 0.5; // camera altitude (Earth radii, ~3,200 km) where tiles take over

export const world = {
  /** Camera height above the mean sphere, in Earth radii. Written by WorldWatcher. */
  altitude: 3,
  /** True when the tiled Earth is drawn instead of the textured globe. */
  tilesActive: false,
  /** Ground height under the camera in Earth radii (from loaded terrain), or null. */
  groundAltitude: null as number | null,
  /** Pose for the next free flight, set by deep links; consumed by FlyControls. */
  flyStart: null as null | { lat: number; lon: number; altKm: number; heading: number; pitch: number }
};

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

/** WGS84 surface radius at a geocentric latitude, in mean Earth radii. */
export function ellipsoidRadius(latDeg: number): number {
  const a = 6378.137;
  const b = 6356.752;
  const p = (latDeg * Math.PI) / 180;
  const c = Math.cos(p);
  const s = Math.sin(p);
  const r = Math.sqrt(((a * a * c) ** 2 + (b * b * s) ** 2) / ((a * c) ** 2 + (b * s) ** 2));
  return r / 6371;
}
