import * as THREE from 'three';
import { sunlightAt } from '@/lib/models/orbit-environment';

// The Starship view's camera (components/camera-look): how it exposes, which
// stars it records, and the numbers of its bloom and grade. Pure maths here,
// so it can be tested without a GPU.
//
// The meter is a guess at what a webcast camera's auto exposure does: exposed
// for sunlight whenever the camera, the Earth it looks at or the sky round it
// is lit, opened up half a stop at night.

export const LOOK = {
  /** Exposure in sunlight (three's toneMappingExposure, ACES). */
  exposureDay: 2.4,
  /** How many stops the camera opens up at night. */
  nightStops: 0.5,
  /** How fast it adapts, per second (settles in about a second). */
  adaptRate: 2.5,
  /** Star brightness at full night gain, and the faintest magnitude it records. */
  starGain: 0.6,
  magLimit: 3.5,
  /** The Sun's disc in display units when bloom draws its glare (3 is the eye's). */
  sunDisc: 4000 / 3,
  /** Grade: black point, S-curve and saturation. (0, 0, 1) is no grade. */
  black: 0.01,
  contrast: 0.15,
  saturation: 1.25,
  bloom: { strength: 0.015, radius: 0.6, threshold: 0.94, knee: 0.06, maxHeightAtDpr1: 1440 },
  /** Pixels drawn at most in the Starship view: about a 1080p webcast frame. */
  maxPixels: 2.1e6
};

/**
 * The highest pixel ratio that keeps a `width` x `height` CSS px canvas within
 * LOOK.maxPixels: below 1 on big screens at 100% (the browser scales the
 * canvas up), never below 0.5.
 */
export const lookPixelRatio = (width: number, height: number) => Math.max(0.5, Math.sqrt(LOOK.maxPixels / Math.max(1, width * height)));

/**
 * After a frame-rate decline: the views' shared sharpness, and the Starship
 * view's own factor on its pixel cap. A decline in the Starship view lowers
 * only its own factor (its pixels are capped below the shared sharpness, so
 * lowering that would do nothing there and stay with the other views); one
 * elsewhere lowers the shared sharpness, as before.
 */
export function afterDecline(inStarship: boolean, sharpness: number, lookScale: number) {
  return inStarship ? { sharpness, lookScale: Math.max(0.5, lookScale - 0.15) } : { sharpness: Math.max(1, sharpness - 0.5), lookScale };
}

const smooth = THREE.MathUtils.smoothstep;

/** Exposure for `night` 0 (sunlit) .. 1 (full night gain). */
export const exposureFor = (night: number) => LOOK.exposureDay * Math.pow(2, LOOK.nightStops * night);

/** Star brightness for `night`: none while exposed for sunlight, a sparse field at full gain. */
export const starGainFor = (night: number) => LOOK.starGain * smooth(night, 0.5, 0.95);

/** One step of auto exposure toward `target`; jumps straight there after a pause (dt over 0.5 s). */
export function adapt(night: number, target: number, dt: number) {
  if (dt > 0.5) return target;
  return night + (target - night) * (1 - Math.exp(-LOOK.adaptRate * Math.min(Math.max(dt, 0), 0.1)));
}

/**
 * How lit the scene the camera meters is, 0..1: the Sun on the camera, or the
 * sky round it. (No separate test for the day side in view: from inside the
 * Earth's shadow none of it can be seen, and a sunlit camera is exposed for
 * the sunlit hull anyway, as the webcast is over the night side.)
 */
export const litFor = (position: THREE.Vector3, sun: THREE.Vector3, skyLight: number) =>
  Math.max(sunlightAt(position, sun), skyLight);
