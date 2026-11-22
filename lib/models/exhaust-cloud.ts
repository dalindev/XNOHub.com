import * as THREE from 'three';

// The cloud of steam and dust that rolls out across the ground when Super
// Heavy lights its 33 engines: soft puffs pushed outward from the pad, fast
// at first and slowing, rising a little, then thinning over a minute or two.
// Drawn as camera-facing billboards in one draw call. Local frame: metres,
// +Y up at the pad; the caller places and scales it (scene units are Earth
// radii, so the billboards need `unit`, one metre in scene units).

const PUFFS = 56;

export interface ExhaustCloud {
  mesh: THREE.Mesh;
  /** Seconds since ignition, how lit the cloud is by daylight (0..1), and the engines' glow (0..1). */
  update(t: number, daylight: number, glow: number): void;
}

export function makeExhaustCloud(unit: number): ExhaustCloud {
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  geo.setAttribute('uv', base.getAttribute('uv'));
  let seed = 11;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const puff = new Float32Array(PUFFS * 4); // direction angle, speed, size, rise
  for (let i = 0; i < PUFFS; i++) {
    // Most of it out along the flame trench's two sides, some all round.
    const trench = i % 3 !== 0;
    puff[i * 4] = trench ? (i % 2 ? 0 : Math.PI) + (rand() - 0.5) * 0.9 : rand() * Math.PI * 2;
    puff[i * 4 + 1] = (trench ? 0.6 : 0.3) + rand() * 0.5;
    puff[i * 4 + 2] = 0.6 + rand() * 0.7;
    puff[i * 4 + 3] = rand();
  }
  geo.setAttribute('aPuff', new THREE.InstancedBufferAttribute(puff, 4));
  geo.instanceCount = PUFFS;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 },
      uUnit: { value: unit },
      uAlpha: { value: 0 },
      uLit: { value: new THREE.Color() }
    },
    vertexShader: /* glsl */ `
      uniform float uT;
      uniform float uUnit;
      attribute vec4 aPuff;
      varying vec2 vUv;
      varying float vNear;
      varying float vShade;
      void main() {
        vShade = 0.82 + 0.3 * fract(aPuff.w * 7.13);
        float grow = 1.0 - exp(-uT / 8.0);
        float r = aPuff.y * 330.0 * grow;
        vec3 c = vec3(cos(aPuff.x) * r, 6.0 + aPuff.w * 60.0 * grow, sin(aPuff.x) * r);
        float size = aPuff.z * (30.0 + 110.0 * grow);
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        mv.xy += position.xy * size * uUnit;
        vUv = uv;
        vNear = 1.0 - clamp(r / 160.0, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uAlpha;
      uniform vec3 uLit;
      varying vec2 vUv;
      varying float vNear;
      varying float vShade;
      void main() {
        vec2 p = vUv - 0.5;
        float d = length(p);
        // Soft, slightly lumpy edge.
        float lump = 0.06 * sin(atan(p.y, p.x) * 5.0 + vNear * 4.0);
        float a = smoothstep(0.5, 0.12, d + lump) * uAlpha;
        // Shaded a little darker underneath.
        vec3 c = uLit * vShade * (0.78 + 0.32 * vUv.y);
        gl_FragColor = vec4(c, a * (0.55 + 0.35 * vNear));
      }
    `,
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.visible = false;

  const day = new THREE.Color(0.86, 0.85, 0.83);
  const fire = new THREE.Color(1.0, 0.62, 0.3);
  const night = new THREE.Color(0.05, 0.05, 0.06);
  return {
    mesh,
    update(t, daylight, glow) {
      mesh.visible = t > 0 && t < 150;
      if (!mesh.visible) return;
      material.uniforms.uT.value = t;
      material.uniforms.uAlpha.value = THREE.MathUtils.smoothstep(t, 0, 2) * (1 - THREE.MathUtils.smoothstep(t, 45, 150));
      const lit = material.uniforms.uLit.value as THREE.Color;
      lit.copy(night).lerp(day, daylight).lerp(fire, glow * 0.3);
    }
  };
}
