import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { envRotationFor } from '@/lib/models/orbit-environment';

// What three.js does with material.envMapRotation (WebGLMaterials, r187):
// build the rotation matrix, transpose it, rotate the lookup direction with it.
function applied(e: THREE.Euler) {
  return new THREE.Matrix4().makeRotationFromEuler(e).transpose();
}

describe('envRotationFor', () => {
  it('turns the local vertical into the environment’s up', () => {
    for (const v of [
      [0.3, 0.8, -0.52],
      [-0.9, 0.1, 0.42],
      [0, -1, 0],
      [0.577, -0.577, 0.577]
    ]) {
      const up = new THREE.Vector3(...v).normalize();
      const m = applied(envRotationFor(up));
      const looked = up.clone().applyMatrix4(m);
      expect(looked.x).toBeCloseTo(0, 5);
      expect(looked.y).toBeCloseTo(1, 5);
      expect(looked.z).toBeCloseTo(0, 5);
    }
  });
});
