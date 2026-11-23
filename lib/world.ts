import * as THREE from 'three';

// Shared, non-React world state read inside useFrame. One writer per field.

/** The Sun's light (three.js units): the scene's one directional light. */
export const SUN_INTENSITY = 2;
/**
 * How bright a white matte surface in full sunlight looks, in the linear
 * colour the renderer works in (the Sun's light over pi). Glowing things
 * (engine flames) are set as multiples of this, so they keep their
 * brightness next to sunlit ones whatever the exposure.
 */
export const SUNLIT_WHITE = SUN_INTENSITY / Math.PI;

/** The camera look outside the Starship view: the eye's (every star, the Sun's own glare). */
export const EYE_LOOK = { on: false, starGain: 1, magLimit: 1000, sunDisc: 1, sunGlare: 1, skyDither: 1 };
export type Look = typeof EYE_LOOK;

export const world = {
  /** Camera height above the ground (or the sea) under it, in Earth radii. Written by WorldWatcher. */
  altitude: 3,
  /** Ground height under the camera in Earth radii (from loaded terrain), or null. */
  groundAltitude: null as number | null,
  /** Unit vector from the Earth's centre to the Sun, scene frame. Written by Sky. */
  sunDirection: new THREE.Vector3(1, 0, 0),
  /** How bright the sky round the camera is: 0 in space or at night, 1 under a daytime sky near the ground. Written by Sky. */
  skyLight: 0,
  /** How big the Earth looks: its radius on screen, in CSS pixels. Written by WorldWatcher. */
  earthPx: 220,
  /** Near plane forced by a close-up chase view (metres-scale models), or null. */
  nearOverride: null as number | null,
  /**
   * The Starship view's camera look (components/camera-look): how bright the
   * stars it records are and the faintest magnitude, the Sun's disc gain and
   * painted glare; the Milky Way is hidden while it's on. Written by
   * CameraLook; EYE_LOOK otherwise.
   */
  look: { ...EYE_LOOK } as Look,
  /** Pose for the next free flight, set by deep links; consumed by FlyControls. */
  flyStart: null as null | { lat: number; lon: number; altKm: number; heading: number; pitch: number }
};

/** Camera height above sea level (the ellipsoid), Earth radii: what the sky model wants, where `altitude` is above the ground under it. */
export const seaLevelAltitude = () => world.altitude + (world.groundAltitude ?? 0);

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
