import * as THREE from 'three';

// A small tiling 3D noise texture for the flames' turbulence: 32³ random
// values, smoothed and filtered trilinearly (value noise). Made once, the same
// every run (32 KB, nothing downloaded).

let cached: THREE.Data3DTexture | null = null;

export function flameNoise() {
  if (cached) return cached;
  const N = 32;
  let seed = 7;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const raw = new Float32Array(N * N * N).map(rand);
  // One pass of a 3×3×3 box blur, wrapping, so neighbouring cells don't jump.
  const at = (x: number, y: number, z: number) => raw[((z + N) % N) * N * N + ((y + N) % N) * N + ((x + N) % N)];
  const data = new Uint8Array(N * N * N);
  let lo = Infinity, hi = -Infinity;
  const blurred = new Float32Array(N * N * N);
  for (let z = 0; z < N; z++)
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        let s = 0;
        for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += at(x + dx, y + dy, z + dz);
        const v = s / 27;
        blurred[z * N * N + y * N + x] = v;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
  // Stretch back to the full range after the blur flattened it.
  for (let i = 0; i < data.length; i++) data[i] = Math.round(((blurred[i] - lo) / (hi - lo)) * 255);
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
