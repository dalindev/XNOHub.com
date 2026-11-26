import * as THREE from 'three';

// What a spacecraft's metal reflects in low orbit: black space above, a thin
// bright line of air at the horizon about 15 degrees below level, and the
// Earth filling everything under it, blue with patches of cloud. Drawn once
// as a small panorama with +Y up, then turned each frame so its "up" is the
// local vertical where the vehicle is (envRotationFor), and dimmed on the
// night side.

const HORIZON_DIP = 15; // degrees below level at ~250 km

function panorama() {
  const w = 512, h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  // Row y is elevation 90 - 180 * y / h degrees.
  const row = (elevation: number) => ((90 - elevation) / 180) * h;
  const limb = row(-HORIZON_DIP);
  const earth = g.createLinearGradient(0, limb, 0, h);
  earth.addColorStop(0, '#9fb9df');
  earth.addColorStop(0.08, '#5d7fae');
  earth.addColorStop(1, '#27456e');
  g.fillStyle = earth;
  g.fillRect(0, limb, w, h - limb);
  // Clouds.
  let seed = 17;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 260; i++) {
    const y = limb + 4 + rand() * (h - limb);
    const x = rand() * w;
    const rx = 6 + rand() * 30;
    g.fillStyle = `rgba(235,240,248,${0.18 + rand() * 0.35})`;
    g.beginPath();
    g.ellipse(x, y, rx, rx * (0.25 + 0.3 * ((y - limb) / (h - limb))), 0, 0, Math.PI * 2);
    g.fill();
  }
  // The air glowing at the limb.
  const air = g.createLinearGradient(0, limb - 10, 0, limb + 4);
  air.addColorStop(0, 'rgba(90,150,255,0)');
  air.addColorStop(0.7, 'rgba(170,210,255,0.9)');
  air.addColorStop(1, 'rgba(230,240,255,1)');
  g.fillStyle = air;
  g.fillRect(0, limb - 10, w, 14);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

// Low down, in the air: a blue sky (deep overhead, pale at the horizon) over
// flat coastal ground, for the first minute of the climb.
function skyPanorama() {
  const w = 512, h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, h / 2);
  sky.addColorStop(0, '#244f97');
  sky.addColorStop(0.75, '#6f98cf');
  sky.addColorStop(1, '#b9cde6');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h / 2);
  const ground = g.createLinearGradient(0, h / 2, 0, h);
  ground.addColorStop(0, '#8d9a9a');
  ground.addColorStop(0.15, '#56604c');
  ground.addColorStop(1, '#333a2c');
  g.fillStyle = ground;
  g.fillRect(0, h / 2, w, h / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

function filtered(renderer: THREE.WebGLRenderer, source: THREE.Texture) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(source);
  source.dispose();
  pmrem.dispose();
  return target.texture;
}

/** The environment in orbit, filtered for rough and smooth metal alike. */
export function makeOrbitEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  return filtered(renderer, panorama());
}

/** The environment low in the air (same size as the orbit one, so swapping them needs no new shaders). */
export function makeSkyEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  return filtered(renderer, skyPanorama());
}

/** Below this the vehicles reflect the sky; above it, black space. */
export const SKY_TOP_KM = 30;

const q = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);

/**
 * The value for a material's envMapRotation that turns the environment's
 * +Y to `up` (a unit vector, scene frame). three.js looks the environment up
 * along the inverse of this rotation (WebGLMaterials, r187: the rotation
 * matrix, transposed), so it is the rotation that takes +Y to `up`.
 */
export function envRotationFor(up: THREE.Vector3, out = new THREE.Euler()) {
  q.setFromUnitVectors(Y, up);
  return out.setFromQuaternion(q, 'XYZ');
}

/**
 * How bright the reflected surroundings are: the sunlit Earth (or sky) by
 * day, close to nothing by night, when only city lights and the Moon are left.
 * The sky is dimmer than the Earth seen from orbit, which fills half of all
 * directions.
 */
export const environmentIntensity = (up: THREE.Vector3, sun: THREE.Vector3, inSky = false) =>
  THREE.MathUtils.lerp(0.02, inSky ? 0.55 : 1, THREE.MathUtils.smoothstep(up.dot(sun), -0.2, 0.25));

/**
 * Direct sunlight at a point (scene frame, Earth radius 1): 1 in sunlight,
 * 0 inside the Earth's shadow, a soft edge where the Sun sets behind the
 * limb (the atmosphere spreads it over about 40 km).
 */
export function sunlightAt(p: THREE.Vector3, sun: THREE.Vector3) {
  const along = p.dot(sun);
  if (along >= 0) return 1;
  const fromAxis = Math.sqrt(Math.max(0, p.lengthSq() - along * along));
  return THREE.MathUtils.smoothstep(fromAxis, 1.0, 1.0065);
}
