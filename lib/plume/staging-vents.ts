import * as THREE from 'three';
import { BOOSTER_HEIGHT_M, HOT_STAGE_RING_Y, R } from '@/lib/models/starship-models';
import { FLAME, unitLuminance } from '@/lib/plume/palette';
import { flameNoise } from '@/lib/plume/noise';
import { SUNLIT_WHITE } from '@/lib/world';

// Hot staging (docs/flames.md): the ship's six engines light while it still
// sits on the booster. Their exhaust hits the steel shield over the booster's
// forward dome and blasts out sideways through the hot-staging ring's vents:
// a ring of radial jets, white-hot at the vents and fanning out into a
// lavender haze about a booster's width beyond them (as the ship's cameras
// show), which from the ground is a broken ring of fire round a dark disc. As
// the ship pulls away, the exhaust spreads off the dome's rim as one sheet
// instead, weaker the further off the ship gets, until the booster turns away.
// The first moments are orange (seen from the ground); then white, cyan at
// the vents (seen from the ship). Brightness and timing are our estimates.
//
// Drawn like the plume, as glowing gas: each jet sits in a frustum round its
// axis, in which the shader walks the line of sight and adds up the light.
// Everything is in the booster's own frame (metres, +Y to its top), close to
// it, so nothing loses precision.

/** The vents' openings: one per repeat of the ring's texture (vehicle-materials), 1.8 m tall, centred on the ring. */
export const VENT_PITCH_M = 1.2;
export const VENT_Y = HOT_STAGE_RING_Y + 0.5 * (BOOSTER_HEIGHT_M - HOT_STAGE_RING_Y);
/** Round the ring (radians from +Z toward +X, as three's cylinders go): the middle of each whole opening. */
export const ventAngles = () => Array.from({ length: Math.floor((2 * Math.PI * R) / VENT_PITCH_M) }, (_, k) => ((k + 0.5) * VENT_PITCH_M) / R);

export interface VentState {
  /** 0..1: out through the vents; off the dome's rim as a sheet. */
  vents: number;
  sheet: number;
  /** 0..1: the orange of the first moments. */
  warm: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => clamp01(x) * clamp01(x) * (3 - 2 * clamp01(x));

/**
 * How the ship's exhaust gets out at hot staging, `since` s after staging,
 * its engines burning at `flame` (0..1), its base `gap` m above the booster's
 * top, their axes `facing` (cosine of the angle between them) apart: through
 * the vents while the ship sits on the ring; as a sheet off the dome once it
 * has lifted off, falling off with distance as less of the plume hits the
 * dome (the share a 4.5 m dome catches of the spreading plume); neither once
 * the booster has turned away.
 */
export function ventState(since: number, flame: number, gap: number, facing: number, out: VentState): VentState {
  const f = Math.max(0, flame) * smooth((facing - 0.6) / 0.35) * (since > 0 ? 1 : 0);
  const g = Math.max(0, gap);
  out.vents = f * (1 - smooth((g - 0.3) / 2.2));
  out.sheet = (f * smooth((g - 0.3) / 1.5)) / (1 + (g / 10) ** 2);
  out.warm = 1 - smooth((since - 0.2) / 1.2);
  return out;
}

const STEPS = 12;

const vertexShader = /* glsl */ `
  attribute vec3 aExit;  // where the jet leaves (m)
  attribute vec4 aDir;   // its axis (unit), and a seed
  attribute vec4 aShape; // brightness (sunlit white), width at the exit (m), spread per m, length (m)
  uniform vec3 uEye;
  varying vec3 vP;
  varying vec3 vExit;
  varying vec4 vDir;
  varying vec4 vShape;
  varying float vInside;
  // How far out the frustum round the jet reaches at z (its haze, to e^-4).
  float bound(vec4 s, float z) { return 3.6 * (s.y + s.z * max(z, 0.0)) + 0.3; }
  void main() {
    vec3 d = aDir.xyz;
    vec3 u = normalize(cross(d, abs(d.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 v = cross(d, u);
    // A unit cylinder (y 0.5 at the exit to -0.5 at the end) stretched over it.
    float z = mix(-0.6, aShape.w, 0.5 - position.y);
    float r = bound(aShape, z);
    vP = aExit + d * z + (u * position.x + v * position.z) * r;
    vExit = aExit;
    vDir = aDir;
    vShape = aShape;
    // Is the eye in the frustum (with a margin, so the near plane can't cut its surface)?
    vec3 e = uEye - aExit;
    float ze = dot(e, d);
    vInside = ze > -1.1 && ze < aShape.w + 0.5 && length(e - d * ze) < bound(aShape, ze) + 0.5 ? 1.0 : 0.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vP, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler3D;
  uniform vec3 uEye;
  uniform float uNearM;
  uniform float uTime;
  uniform float uSW;
  uniform float uSat;
  uniform float uHaze;
  uniform vec3 uColHot;
  uniform vec3 uColEnd;
  uniform vec3 uColHaze;
  uniform sampler3D uNoise;
  varying vec3 vP;
  varying vec3 vExit;
  varying vec4 vDir;
  varying vec4 vShape;
  varying float vInside;

  // Light given off toward the eye per metre at p (sunlit-white units).
  vec3 emission(vec3 p) {
    vec3 e = p - vExit;
    float z = dot(e, vDir.xyz);
    if (z < 0.0) return vec3(0.0);
    float rho2 = max(dot(e, e) - z * z, 0.0);
    float w = vShape.y + vShape.z * z;
    // Each shape scaled so a line of sight across it (side-on, through the
    // axis) sees its level; spreading, the same gas covers more, so dimmer.
    float k = vShape.y / w;
    float core = exp(-rho2 / (w * w)) / (1.7725 * w);
    float haze = exp(-rho2 / (3.24 * w * w)) / (3.19 * w);
    // Along it: out of the vent, gone about a booster's width beyond.
    float s = z / vShape.w;
    float axial = smoothstep(0.0, 0.5, z) * (1.0 - smoothstep(0.35, 1.0, s));
    // Lumps, carried outward with the gas.
    vec3 q = (p - vDir.xyz * uTime * 40.0) * 0.35 + vDir.w * 7.0;
    float n = texture(uNoise, q).r + 0.5 * texture(uNoise, q * 2.3 + 0.31).r - 0.75;
    float lump = max(0.0, 1.0 + 1.3 * n);
    vec3 col = mix(uColHot, uColEnd, smoothstep(0.05, 0.6, s));
    return vShape.x * k * axial * lump * (col * core + uColHaze * uHaze * haze);
  }

  void main() {
    if ((vInside > 0.5) == gl_FrontFacing) discard;
    vec3 rd = normalize(vP - uEye);
    // Outside: from where the line of sight enters the frustum to where it
    // leaves the ball round it. Inside: from the camera to the frustum's far side.
    vec3 ro = vInside > 0.5 ? uEye : vP;
    float t0 = vInside > 0.5 ? uNearM : 0.0;
    float t1;
    if (vInside > 0.5) t1 = dot(vP - uEye, rd);
    else {
      float len = vShape.w;
      float rb = 3.6 * (vShape.y + vShape.z * len) + 0.3;
      vec3 oc = ro - (vExit + vDir.xyz * 0.5 * len);
      float b = dot(oc, rd);
      float c = dot(oc, oc) - (0.25 * len * len + rb * rb);
      t1 = -b + sqrt(max(b * b - c, 0.0));
    }
    // Not through the hull: the vehicles are a 4.5 m cylinder about the axis here.
    float a = dot(rd.xz, rd.xz);
    float bb = dot(ro.xz, rd.xz);
    float cc = dot(ro.xz, ro.xz) - ${R.toFixed(2)} * ${R.toFixed(2)};
    if (cc < -0.05) discard;
    float disc = bb * bb - a * cc;
    if (disc > 0.0 && a > 1e-6) {
      float tin = (-bb - sqrt(disc)) / a;
      if (tin > t0) t1 = min(t1, tin);
    }
    if (t1 <= t0) discard;
    float h = (t1 - t0) / float(${STEPS});
    float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    vec3 L = vec3(0.0);
    for (int i = 0; i < ${STEPS}; i++) L += emission(ro + rd * (t0 + (float(i) + j) * h));
    L *= h;
    // The thick of it is not see-through: brightness levels off.
    L = uSat * (1.0 - exp(-L / uSat));
    gl_FragColor = vec4(L * uSW, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    // Premultiplied, screened by its own brightness (as the plume).
    gl_FragColor.a = clamp(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
  }
`;

export interface VentFrame {
  camera: THREE.Camera;
  /** Seconds since staging; seconds for the turbulence (frozen for repeatable shots). */
  since: number;
  time: number;
  /** The ship's engines, 0..1. */
  flame: number;
  /** How far the ship's base is above the booster's top (m), and the cosine of the angle between their axes. */
  gap: number;
  facing: number;
}

export interface StagingVents {
  /** Add to the booster's own frame (metres). */
  group: THREE.Group;
  update(f: VentFrame): VentState;
  dispose(): void;
}

/**
 * Jets' brightness at full, side-on at the vent (sunlit-white units): the
 * ring is clipped in every photo (at least 7x the sky), and seen edge-on,
 * through a dozen jets at once, it is far brighter still.
 */
const VENT_LEVEL = 1.5;
const SHEET_LEVEL = 0.5;
/** Their width at the exit (m) and spread (m per m), and how far they reach (m): separate jets, a starburst, with haze between. */
const VENT_SHAPE = [0.35, 0.16, 9] as const;
const SHEET_SHAPE = [0.6, 0.3, 9] as const;
/** How far back they lean, toward the booster's base (radians): out of the vents; off the dome's rim. */
const VENT_TILT = 0.17;
const SHEET_TILT = 0.45;

const C = {
  hotWarm: unitLuminance(FLAME.stagingCore),
  hotCool: unitLuminance(FLAME.stagingJet),
  endWarm: unitLuminance(FLAME.stagingOrange),
  endCool: unitLuminance(FLAME.stagingCloud),
  // The haze is the faintest part: its lavender, half washed out by the white jets in it.
  haze: unitLuminance(FLAME.stagingHaze).lerp(new THREE.Color(1, 1, 1), 0.4)
};

export function makeStagingVents(): StagingVents {
  const angles = ventAngles();
  const n = angles.length;
  const count = 2 * n; // the vents, then the sheet
  const base = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  const exit = new Float32Array(count * 3);
  const dir = new Float32Array(count * 4);
  angles.forEach((a, k) => {
    const sx = Math.sin(a), cz = Math.cos(a);
    exit.set([sx * (R + 0.05), VENT_Y, cz * (R + 0.05)], k * 3);
    dir.set([sx * Math.cos(VENT_TILT), -Math.sin(VENT_TILT), cz * Math.cos(VENT_TILT), (k * 0.618) % 1], k * 4);
    exit.set([sx * (R + 0.05), BOOSTER_HEIGHT_M + 0.3, cz * (R + 0.05)], (n + k) * 3);
    dir.set([sx * Math.cos(SHEET_TILT), -Math.sin(SHEET_TILT), cz * Math.cos(SHEET_TILT), (k * 0.382 + 0.5) % 1], (n + k) * 4);
  });
  geo.setAttribute('aExit', new THREE.InstancedBufferAttribute(exit, 3));
  geo.setAttribute('aDir', new THREE.InstancedBufferAttribute(dir, 4));
  const shape = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aShape', shape);
  geo.instanceCount = count;

  const u = {
    uEye: { value: new THREE.Vector3() },
    uNearM: { value: 1 },
    uTime: { value: 0 },
    uSW: { value: SUNLIT_WHITE },
    uSat: { value: 3 },
    uHaze: { value: 0.15 },
    uColHot: { value: new THREE.Color() },
    uColEnd: { value: new THREE.Color() },
    uColHaze: { value: C.haze.clone() },
    uNoise: { value: flameNoise() }
  };
  const material = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader,
    fragmentShader,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const jets = new THREE.Mesh(geo, material);
  jets.frustumCulled = false;
  jets.renderOrder = 6;

  // The fire inside the ring, seen through the vents: a band just inside
  // them, in front of the dark behind (starship-models' void at R - 0.3).
  const bandGeo = new THREE.CylinderGeometry(R - 0.12, R - 0.12, 0.72 * (BOOSTER_HEIGHT_M - HOT_STAGE_RING_Y), 64, 1, true).translate(0, VENT_Y, 0);
  const bandMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
  const band = new THREE.Mesh(bandGeo, bandMat);

  const group = new THREE.Group();
  group.name = 'staging-vents';
  group.add(jets, band);
  group.visible = false;
  const state: VentState = { vents: 0, sheet: 0, warm: 0 };
  const inv = new THREE.Matrix4();
  const scale = new THREE.Vector3();

  return {
    group,
    update(f) {
      const s = ventState(f.since, f.flame, f.gap, f.facing, state);
      group.visible = s.vents + s.sheet > 0.002;
      if (!group.visible) return s;
      jets.updateWorldMatrix(true, false);
      inv.copy(jets.matrixWorld).invert();
      u.uEye.value.copy(f.camera.position).applyMatrix4(inv);
      u.uNearM.value = (f.camera as THREE.PerspectiveCamera).near / scale.setFromMatrixScale(jets.matrixWorld).x;
      u.uTime.value = f.time;
      u.uColHot.value.copy(C.hotCool).lerp(C.hotWarm, s.warm);
      u.uColEnd.value.copy(C.endCool).lerp(C.endWarm, s.warm);
      for (let k = 0; k < n; k++) {
        shape.setXYZW(k, VENT_LEVEL * s.vents, VENT_SHAPE[0], VENT_SHAPE[1], VENT_SHAPE[2]);
        // Further off, the sheet comes off the dome wider and reaches further.
        shape.setXYZW(n + k, SHEET_LEVEL * s.sheet, SHEET_SHAPE[0], SHEET_SHAPE[1], SHEET_SHAPE[2] + 0.25 * Math.max(0, f.gap));
      }
      shape.needsUpdate = true;
      jets.visible = true;
      band.visible = s.vents > 0.002;
      // White-hot behind the vents, flickering.
      const flicker = 0.88 + 0.08 * Math.sin(f.time * 37.1) + 0.04 * Math.sin(f.time * 91.7);
      bandMat.color.copy(u.uColHot.value).multiplyScalar(3 * VENT_LEVEL * s.vents * flicker * SUNLIT_WHITE);
      return s;
    },
    dispose() {
      base.dispose();
      geo.dispose();
      material.dispose();
      bandGeo.dispose();
      bandMat.dispose();
    }
  };
}
