import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makePlume, type PlumeFrame } from './plume-material';
import { boosterLook, newPlumeLook } from './look';

const frame = (cutoff: number): PlumeFrame => ({
  look: boosterLook(0.3, 33, false, newPlumeLook()),
  camera: new THREE.PerspectiveCamera(),
  time: 0,
  sunDirection: new THREE.Vector3(0, 1, 0),
  sunlit: 1,
  ground: null,
  reach: 1e6,
  cutoff
});

describe('plume material', () => {
  it('stays on the nozzles while the engines burn, and leaves them after cutoff', () => {
    const p = makePlume();
    const u = (p.mesh.material as THREE.ShaderMaterial).uniforms;
    p.update(frame(0));
    // The gas fades in over 10 m below where it starts: all of that ramp lies
    // above the top of the cone the plume is drawn in, so nothing is cut.
    expect(u.uCut.value.y + 10).toBeLessThanOrEqual(u.uZRange.value.x);
    p.update(frame(50));
    expect(u.uCut.value.y).toBe(50);
    p.dispose();
  });

  it('keeps the glow next to the exits below them, off the engine bells', () => {
    const p = makePlume();
    expect((p.mesh.material as THREE.ShaderMaterial).fragmentShader).toMatch(/float nearW = step\(0\.0, z\) \* \(1\.0 - smoothstep\(0\.0, 4\.5, z\)\);/);
    p.dispose();
  });
});
