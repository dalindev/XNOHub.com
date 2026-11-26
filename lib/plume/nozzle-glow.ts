import * as THREE from 'three';
import type { EngineSlot } from '@/lib/models/starship-models';
import { sunlight } from '@/lib/models/vehicle-materials';
import { SUNLIT_WHITE } from '@/lib/world';
import { FLAME, unitLuminance } from '@/lib/plume/palette';

// What a burning engine shows of itself: looking into its nozzle, the
// white-hot gas filling the exit (a disc just inside it), and the inside of
// the bell lit up by it, cream at the throat to peach (sea level) or brown-gold
// (vacuum) at the rim. In space that is all there is to see: the exhaust
// itself is invisible against daylight (photos from the booster's camera show
// six glowing nozzles and nothing behind them).
//
// Brightness in sunlit-white units (lib/world SUNLIT_WHITE), from photos: the
// disc's centre about 4 (always clipped), the rim 1.5; a vacuum engine's 3
// and 1; the bell's inside 1 at the rim to 2 at the throat. Our estimates
// within what the photos allow (at least 1: every photo clips them).

interface Look {
  centre: THREE.Color;
  rim: THREE.Color;
  centreLevel: number;
  rimLevel: number;
}
const SEA: Look = { centre: unitLuminance(FLAME.exit), rim: unitLuminance(FLAME.exitBand), centreLevel: 4, rimLevel: 1.5 };
const VAC: Look = { centre: unitLuminance(FLAME.vacCentre), rim: unitLuminance(FLAME.vacRim), centreLevel: 3, rimLevel: 1 };

export interface NozzleGlow {
  /** Per engine, 0 off .. 1 burning (lib/missions/starship Body.lit). */
  update(lit: ArrayLike<number>): void;
  /** Frees its GPU memory; it is uploaded again if drawn after (React runs cleanups early in development). */
  dispose(): void;
}

/**
 * Lights up a vehicle's engines: adds exit discs to `group` (the vehicle's
 * own frame, metres) and gives `insides` (its merged bell insides, carrying
 * aEngine and aDepth) a material that glows engine by engine. `vacuum` says
 * which ring is vacuum engines (Starship's ring 1), if any.
 */
export function makeNozzleGlow(group: THREE.Object3D, engines: EngineSlot[], insides: THREE.Mesh, vacuumRing = -1): NozzleGlow {
  const n = engines.length;
  const look = (e: EngineSlot) => (e.ring === vacuumRing ? VAC : SEA);

  // Exit discs: one instanced draw.
  const base = new THREE.CircleGeometry(1, 32);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  const exit = new Float32Array(n * 4); // x, y, z, radius
  const centre = new Float32Array(n * 4); // colour × level
  const rim = new Float32Array(n * 4);
  engines.forEach((e, i) => {
    exit.set([e.x, e.exitY + 0.02, e.z, e.exitR - 0.015], i * 4);
    const l = look(e);
    centre.set([l.centre.r * l.centreLevel, l.centre.g * l.centreLevel, l.centre.b * l.centreLevel, 0], i * 4);
    rim.set([l.rim.r * l.rimLevel, l.rim.g * l.rimLevel, l.rim.b * l.rimLevel, 0], i * 4);
  });
  const litAttr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  litAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aExit', new THREE.InstancedBufferAttribute(exit, 4));
  geo.setAttribute('aCentre', new THREE.InstancedBufferAttribute(centre, 4));
  geo.setAttribute('aRim', new THREE.InstancedBufferAttribute(rim, 4));
  geo.setAttribute('aLit', litAttr);
  geo.instanceCount = n;
  const discMaterial = new THREE.ShaderMaterial({
    uniforms: { uSW: { value: SUNLIT_WHITE } },
    vertexShader: /* glsl */ `
      attribute vec4 aExit;
      attribute vec4 aCentre;
      attribute vec4 aRim;
      attribute float aLit;
      varying vec2 vUv;
      varying vec3 vCentre;
      varying vec3 vRim;
      varying float vLit;
      void main() {
        vUv = position.xy;
        vCentre = aCentre.rgb;
        vRim = aRim.rgb;
        vLit = aLit;
        vec3 p = aExit.xyz + vec3(position.x, 0.0, position.y) * aExit.w;
        gl_Position = aLit > 0.001 ? projectionMatrix * modelViewMatrix * vec4(p, 1.0) : vec4(0.0, 0.0, -2.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uSW;
      varying vec2 vUv;
      varying vec3 vCentre;
      varying vec3 vRim;
      varying float vLit;
      void main() {
        float r = length(vUv);
        vec3 c = mix(vCentre, vRim, smoothstep(0.25, 1.0, r));
        gl_FragColor = vec4(c * vLit * uSW, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const discs = new THREE.Mesh(geo, discMaterial);
  discs.frustumCulled = false;
  discs.renderOrder = 6;
  group.add(discs);

  // The bells' insides: still dark metal lit like the rest, plus their glow.
  const lit = { value: new Float32Array(n) };
  const throatGlow = unitLuminance(FLAME.vacCentre);
  const glow = new THREE.MeshStandardMaterial({ color: 0x23201e, metalness: 0.3, roughness: 0.8, side: THREE.BackSide });
  const vacuumOf = new Float32Array(n).map((_, i) => (engines[i].ring === vacuumRing ? 1 : 0));
  glow.onBeforeCompile = (shader) => {
    shader.uniforms.uSunlight = sunlight;
    shader.uniforms.uLit = lit;
    shader.uniforms.uVacuum = { value: vacuumOf };
    shader.uniforms.uSW = { value: SUNLIT_WHITE };
    shader.uniforms.uRimSea = { value: SEA.rim };
    shader.uniforms.uRimVac = { value: VAC.rim };
    shader.uniforms.uThroat = { value: throatGlow };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aEngine;
        attribute float aDepth;
        uniform float uLit[${n}];
        uniform float uVacuum[${n}];
        varying float vGlowLit;
        varying float vGlowDepth;
        varying float vGlowVac;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        int engine = int(aEngine + 0.5);
        vGlowLit = uLit[engine];
        vGlowVac = uVacuum[engine];
        vGlowDepth = aDepth;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uSunlight;
        uniform float uSW;
        uniform vec3 uRimSea;
        uniform vec3 uRimVac;
        uniform vec3 uThroat;
        varying float vGlowLit;
        varying float vGlowDepth;
        varying float vGlowVac;`
      )
      .replace(
        '#include <lights_fragment_begin>',
        THREE.ShaderChunk.lights_fragment_begin.replace(
          'getDirectionalLightInfo( directionalLight, directLight );',
          'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= uSunlight;'
        )
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float deep = vGlowDepth * vGlowDepth;
        vec3 glowColour = mix(mix(uRimSea, uRimVac, vGlowVac), uThroat, deep);
        totalEmissiveRadiance += glowColour * mix(1.0, 2.0, vGlowDepth) * vGlowLit * uSW;`
      );
  };
  glow.customProgramCacheKey = () => `nozzle-glow-${n}-${vacuumRing}`;
  insides.material = glow;

  return {
    update(values) {
      let any = false;
      for (let i = 0; i < n; i++) {
        const v = values[i] ?? 0;
        litAttr.array[i] = v;
        lit.value[i] = v;
        any ||= v > 0.001;
      }
      litAttr.needsUpdate = true;
      discs.visible = any;
    },
    dispose() {
      geo.dispose();
      discMaterial.dispose();
      glow.dispose();
    }
  };
}
