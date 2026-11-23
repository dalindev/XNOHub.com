import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { METRE_LIGHTS, patchMetreLights } from '@/lib/metre-lights';

describe('point lights in metres', () => {
  it('measures the falloff distance in metres', () => {
    expect(METRE_LIGHTS).toBe(true);
    const chunk = THREE.ShaderChunk.lights_pars_begin;
    expect(chunk).toContain('pow( lightDistance * 6371000.0, decayExponent )');
    expect(chunk).not.toContain('pow( lightDistance, decayExponent )');
  });

  it('patches once, and says so when three has changed the line', () => {
    const chunks = { lights_pars_begin: THREE.ShaderChunk.lights_pars_begin };
    expect(patchMetreLights(chunks)).toBe(true);
    expect(chunks.lights_pars_begin).toBe(THREE.ShaderChunk.lights_pars_begin);
    expect(patchMetreLights({ lights_pars_begin: 'float distanceFalloff = 1.0;' })).toBe(false);
  });
});
