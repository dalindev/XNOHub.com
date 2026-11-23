import * as THREE from 'three';
import { EARTH_RADIUS_KM } from '@/lib/geo';

// Point lights measured in metres. The scene is in Earth radii, where three's
// distance falloff, 1 / max(d^decay, 0.01), never leaves its clamp (anything
// within 600 km of a light gets the same 100x), so the engine and bay lights
// lit nothing. Measured in metres, `decay` means what it says again: a
// light's intensity is the irradiance 1 m away, falling off as 1/d^decay.
// Its cutoff distance stays in scene units (only the ratio d / cutoff is used).
//
// three builds every lit material from this chunk when it compiles it, so the
// patch must run before the first render. It runs when this module loads:
// import METRE_LIGHTS where the lights are made (a bare `import` is dropped,
// as package.json marks every module free of side effects).
// lib/metre-lights.test checks that three still has the line it edits.

const FROM = 'pow( lightDistance, decayExponent )';
const TO = `pow( lightDistance * ${(EARTH_RADIUS_KM * 1000).toFixed(1)}, decayExponent )`;

export function patchMetreLights(chunks: Record<string, string> = THREE.ShaderChunk as unknown as Record<string, string>) {
  const chunk = chunks.lights_pars_begin;
  if (chunk.includes(TO)) return true;
  if (!chunk.includes(FROM)) return false;
  chunks.lights_pars_begin = chunk.replace(FROM, TO);
  return true;
}

/** Whether point lights are in metres (false only if a three upgrade changed the chunk). */
export const METRE_LIGHTS = patchMetreLights();
if (!METRE_LIGHTS) console.warn('lib/metre-lights: three changed getDistanceAttenuation; the engine and bay lights are off.');
