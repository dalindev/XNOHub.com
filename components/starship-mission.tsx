'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { buildStarship, buildSuperHeavy, SHIP_HEIGHT_M, BOOSTER_HEIGHT_M, SLOT_Y, R } from '@/lib/models/starship-models';
import { StarlinkV3Fleet } from '@/lib/models/starlink-v3';
import { makeExhaustCloud } from '@/lib/models/exhaust-cloud';
import { buildPayloadBay, onboardCam, placeOnboardCamera, type OnboardCamId } from '@/lib/models/starship-onboard';
import { reflectiveMaterials, sunlight } from '@/lib/models/vehicle-materials';
import { makeOrbitEnvironment, makeSkyEnvironment, envRotationFor, environmentIntensity, sunlightAt, SKY_TOP_KM } from '@/lib/models/orbit-environment';
import {
  createMissionState,
  missionAt,
  satelliteAt,
  newSatellitePose,
  DEPLOY_COUNT,
  DOOR_OPEN_S,
  MISSION_END_S,
  STAGING_S,
  type Phase
} from '@/lib/missions/starship';
import { METRE } from '@/lib/chase-camera';
import { useOrbitView, placeOrbitCamera, RIDE_FOV, type OrbitView } from '@/components/use-orbit-view';
import { world } from '@/lib/world';

// One Starship mission at a time: the V3 stack lifts off from Starbase,
// hot-stages, the booster flies home, the ship reaches orbit and lets out 60
// Starlink V3 satellites one by one, which rise away in a line and slowly
// open their arrays. The clock is the real one (lib/missions/starship) run
// as fast as the viewer picks (`speed`). Always drawn at true scale: from far
// away a 124 m rocket is far smaller than a pixel, so a marker shows where it
// is instead (and the UI says so).

export interface MissionInfo {
  phase: Phase;
  /** Mission elapsed time, real seconds. */
  t: number;
  altKm: number;
  speedKms: number;
  deployed: number;
  unfolded: number;
  /** In the Earth's shadow: lit only by its glow and its own engines. */
  inShadow: boolean;
  /** Too small to see from here: shown by a marker. */
  marked: boolean;
  /** The booster is still flying (its camera can be watched). */
  boosterFlying: boolean;
}

/** Riding along: the chase view, or one of the vehicles' own cameras (lib/models/starship-onboard). */
export type StarshipCam = 'chase' | OnboardCamId;

interface Props {
  /** Bump to launch (ignored while a mission is flying). */
  launchSignal: number;
  /** Camera rides along with the ship. */
  follow: boolean;
  /** Which camera, while riding along. */
  cam: StarshipCam;
  /** How many times faster than real the mission clock runs. */
  speed: number;
  onInfo: (info: MissionInfo | null) => void;
}

// An engine plume: a cone from the nozzle that spreads as it goes, brightest
// at the nozzle and along its axis, fading toward its end and edges, additive
// so it glows. Its size is set every frame (plumeShape): at sea level the air
// holds the exhaust in a long flame; higher up it balloons out.
function plume(inner: number, outer: number) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 32, 16, true).translate(0, -0.5, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLength: { value: 1 },
      uNozzle: { value: 1 },
      uEnd: { value: 1 },
      uStrength: { value: 1 },
      uInner: { value: new THREE.Color(inner) },
      uOuter: { value: new THREE.Color(outer) }
    },
    vertexShader: /* glsl */ `
      uniform float uLength;
      uniform float uNozzle;
      uniform float uEnd;
      varying float vT;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vT = clamp(-position.y, 0.0, 1.0);
        float r = mix(uNozzle, uEnd, pow(vT, 0.6));
        vec4 w = modelMatrix * vec4(position.x * r, position.y * uLength, position.z * r, 1.0);
        vN = normalize(mat3(modelMatrix) * vec3(normal.x, 0.0, normal.z));
        vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uStrength;
      uniform vec3 uInner;
      uniform vec3 uOuter;
      varying float vT;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float face = abs(dot(normalize(vN), normalize(vV)));
        float a = pow(face, 1.6) * pow(1.0 - vT, 1.4) * uStrength;
        vec3 c = mix(uInner, uOuter, smoothstep(0.0, 0.45, vT));
        gl_FragColor = vec4(c * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 5;
  mesh.frustumCulled = false;
  return mesh;
}

interface PlumeShape {
  nozzle: number; // m
  end: [number, number]; // end radius (m) at sea level, in vacuum
  length: [number, number]; // m, at sea level, in vacuum
  strength: [number, number];
}
// Super Heavy's 33 engines: one long flame about as wide as the booster at
// liftoff, hundreds of metres across once the air thins. The ship always
// burns in near-vacuum: a short bright core inside a huge faint glow.
const BOOSTER_CORE: PlumeShape = { nozzle: 4.2, end: [7, 26], length: [70, 120], strength: [1, 0.95] };
const BOOSTER_GLOW: PlumeShape = { nozzle: 4.6, end: [14, 170], length: [170, 650], strength: [0.95, 0.75] };
const SHIP_CORE: PlumeShape = { nozzle: 3.4, end: [11, 11], length: [48, 48], strength: [1, 1] };
const SHIP_GLOW: PlumeShape = { nozzle: 4.2, end: [95, 95], length: [380, 380], strength: [0.75, 0.75] };

function plumeShape(mesh: THREE.Mesh, shape: PlumeShape, on: number, altKm: number, flicker: number) {
  mesh.visible = on > 0.01;
  if (!mesh.visible) return;
  const thin = THREE.MathUtils.smoothstep(altKm, 2, 60); // 0 sea level .. 1 near vacuum
  const u = (mesh.material as THREE.ShaderMaterial).uniforms;
  u.uNozzle.value = shape.nozzle;
  u.uEnd.value = THREE.MathUtils.lerp(shape.end[0], shape.end[1], thin) * (0.6 + 0.4 * on);
  u.uLength.value = THREE.MathUtils.lerp(shape.length[0], shape.length[1], thin) * on * flicker;
  u.uStrength.value = THREE.MathUtils.lerp(shape.strength[0], shape.strength[1], thin) * Math.min(1, on * 1.5);
}

// The light the engines throw on the vehicle (and the ground at liftoff).
// The scene is in Earth radii, so a point light's intensity is scaled by a
// metre squared: about as bright as the Sun 20 m from the flame. The lights
// stay in the scene at zero when nothing burns, so lighting one up doesn't
// make every material in the scene rebuild its shader.
const engineLight = (color: number) => new THREE.PointLight(color, 0, 900 * METRE, 2);
const ENGINE_LIGHT = 900 * METRE * METRE;
const SHIP_LIGHT_AT = new THREE.Vector3(0, -6, 0); // metres, below each hull
const BOOSTER_LIGHT_AT = new THREE.Vector3(0, -8, 0);
// The payload bay's lamps for the dispenser camera: cool white LEDs, a few
// metres' reach, on from a minute before the door opens.
const BAY_LAMP = 5 * METRE * METRE;
const bayLamp = () => new THREE.PointLight(0xe4ecff, 0, 12 * METRE, 2);
// Riding on a vehicle's camera: it sits right against the hull.
const ONBOARD_NEAR = 0.15 * METRE;

// A glowing dot in corner brackets, drawn the same size on screen at any distance.
function marker() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  glow.addColorStop(0, 'rgba(255,240,215,1)');
  glow.addColorStop(0.18, 'rgba(255,210,150,0.9)');
  glow.addColorStop(0.35, 'rgba(255,180,100,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 64);
  // Corner brackets, not a ring, so it can't be mistaken for a node.
  g.strokeStyle = 'rgba(255,200,140,0.95)';
  g.lineWidth = 3.5;
  g.lineCap = 'round';
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = 32 + sx * 24, y = 32 + sy * 24;
    g.beginPath();
    g.moveTo(x - sx * 9, y);
    g.lineTo(x, y);
    g.lineTo(x, y - sy * 9);
    g.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, sizeAttenuation: false, depthTest: false, transparent: true, blending: THREE.AdditiveBlending }));
  sprite.renderOrder = 8;
  sprite.visible = false;
  return sprite;
}

const MARKER_PX = 22;
const MARK_BELOW_PX = 5; // the ship shorter than this on screen: mark it

export const StarshipMission: React.FC<Props> = ({ launchSignal, follow, cam, speed, onInfo }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  /** Mission elapsed time (real seconds), or null when no mission is flying. */
  const met = useRef<number | null>(null);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  const camRef = useRef(cam);
  useEffect(() => {
    camRef.current = cam;
  }, [cam]);
  // Riding along, the camera is the viewer's: drag to look round the ship, scroll to zoom.
  const view = useOrbitView(follow, { azimuth: 1.1, elevation: 0.12, distance: 1 });
  const state = useMemo(() => createMissionState(), []);

  // One memo for every object, for the same reason as in StarlinkFollow: a
  // second run would move children into a group that is then thrown away.
  const parts = useMemo(() => {
    const ship = buildStarship();
    const booster = buildSuperHeavy();
    const shipPlume = [plume(0xffffff, 0xa9c2ff), plume(0xf2f5ff, 0x6f8fff)];
    const boosterPlume = [plume(0xfffbf0, 0xffb066), plume(0xffe2b8, 0xff7a22)];
    shipPlume.forEach((p) => ship.group.add(p.translateY(0.2)));
    boosterPlume.forEach((p) => booster.add(p.translateY(-0.4)));
    const shipLight = engineLight(0xdfe6ff);
    const boosterLight = engineLight(0xffb070);
    const bay = buildPayloadBay();
    ship.group.add(bay.group);
    const lamps = bay.lamps.map(bayLamp);
    const lights = new THREE.Group();
    lights.add(shipLight, boosterLight, ...lamps);
    const fleet = new StarlinkV3Fleet(DEPLOY_COUNT);
    ship.group.add(fleet.group); // ship coordinates, metres
    const shipRoot = new THREE.Group();
    const boosterRoot = new THREE.Group();
    shipRoot.add(ship.group);
    boosterRoot.add(booster);
    shipRoot.scale.setScalar(METRE);
    boosterRoot.scale.setScalar(METRE);
    const shipMarker = marker();
    const boosterMarker = marker();
    // The exhaust cloud on the ground at Starbase, local +Y up.
    const cloud = makeExhaustCloud(METRE);
    const cloudRoot = new THREE.Group();
    const onPad = missionAt(0, createMissionState()).booster;
    cloudRoot.position.copy(onPad.pos);
    cloudRoot.quaternion.copy(onPad.quat);
    cloudRoot.scale.setScalar(METRE);
    cloudRoot.add(cloud.mesh);
    const root = new THREE.Group();
    root.add(shipRoot, boosterRoot, shipMarker, boosterMarker, cloudRoot);
    root.visible = false;
    return { ship, booster, shipPlume, boosterPlume, shipLight, boosterLight, bay, lamps, lights, fleet, shipRoot, boosterRoot, shipMarker, boosterMarker, cloud, cloudRoot, root };
  }, []);

  useEffect(() => () => parts.fleet.dispose(), [parts]);

  // What the metal reflects: the sky low down; space above and the Earth below higher up.
  const envs = useMemo(() => ({ orbit: makeOrbitEnvironment(gl), sky: makeSkyEnvironment(gl) }), [gl]);
  useEffect(() => {
    for (const m of reflectiveMaterials()) {
      m.envMap = envs.sky;
      m.needsUpdate = true;
    }
    return () => {
      for (const m of reflectiveMaterials()) m.envMap = null;
      envs.orbit.dispose();
      envs.sky.dispose();
    };
  }, [envs]);

  useEffect(() => {
    if (launchSignal > 0 && met.current === null) met.current = 0;
  }, [launchSignal]);

  // Dev: __xno.starship(seconds) jumps a flying mission to that many seconds after liftoff (mission time);
  // __xno.shipView({ azimuth, elevation, distance }) holds the follow camera there.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as { __xno?: Record<string, unknown> };
    w.__xno = {
      ...(w.__xno ?? {}),
      starship: (seconds: number) => (met.current = seconds),
      shipView: (v: Partial<Omit<OrbitView, 'held'>>) => Object.assign(view.current, v, { held: true }),
      shipCam: (id: StarshipCam) => (camRef.current = id)
    };
  }, [view]);

  useEffect(() => {
    if (!follow) world.nearOverride = null;
    return () => {
      world.nearOverride = null;
    };
  }, [follow]);

  const lastInfo = useRef(0);
  const tmp = useMemo(
    () => ({
      up: new THREE.Vector3(),
      fwd: new THREE.Vector3(),
      centre: new THREE.Vector3(),
      offset: new THREE.Vector3(),
      axis: new THREE.Vector3(),
      euler: new THREE.Euler(),
      sat: newSatellitePose(),
      m: new THREE.Matrix4(),
      one: new THREE.Vector3(1, 1, 1)
    }),
    []
  );

  useFrame(({ clock, size }, delta) => {
    const { root, shipRoot, boosterRoot, ship, shipPlume, boosterPlume, shipLight, boosterLight, bay, lamps, fleet, shipMarker, boosterMarker, cloud, cloudRoot } = parts;
    if (met.current === null) {
      root.visible = false;
      shipLight.intensity = boosterLight.intensity = 0;
      for (const l of lamps) l.intensity = 0;
      return;
    }
    // A long frame (a hidden tab) doesn't jump the mission ahead.
    met.current += Math.min(delta, 0.1) * speedRef.current;
    const t = met.current;
    if (t > MISSION_END_S) {
      met.current = null;
      root.visible = false;
      shipLight.intensity = boosterLight.intensity = 0;
      for (const l of lamps) l.intensity = 0;
      world.nearOverride = null;
      onInfo(null);
      return;
    }
    missionAt(t, state);
    root.visible = true;

    shipRoot.position.copy(state.ship.pos);
    shipRoot.quaternion.copy(state.ship.quat);
    if (t < STAGING_S) {
      // Stacked: the ship rides on top of the booster.
      boosterRoot.position.copy(state.ship.pos);
      boosterRoot.quaternion.copy(state.ship.quat);
      tmp.offset.set(0, BOOSTER_HEIGHT_M * METRE, 0).applyQuaternion(state.ship.quat);
      shipRoot.position.add(tmp.offset);
    } else {
      boosterRoot.position.copy(state.booster.pos);
      boosterRoot.quaternion.copy(state.booster.quat);
    }
    boosterRoot.visible = state.booster.visible;

    const flicker = 0.94 + Math.sin(clock.elapsedTime * 43) * 0.03 + Math.random() * 0.03;
    plumeShape(shipPlume[0], SHIP_CORE, state.ship.flame, state.ship.altKm, flicker);
    plumeShape(shipPlume[1], SHIP_GLOW, state.ship.flame, state.ship.altKm, flicker);
    const boosterFlame = Math.min(1, state.booster.flame);
    plumeShape(boosterPlume[0], BOOSTER_CORE, boosterFlame, state.booster.altKm, flicker);
    plumeShape(boosterPlume[1], BOOSTER_GLOW, boosterFlame, state.booster.altKm, flicker);
    shipLight.intensity = ENGINE_LIGHT * 0.35 * state.ship.flame * flicker;
    boosterLight.intensity = ENGINE_LIGHT * boosterFlame * flicker * (boosterRoot.visible ? 1 : 0);
    shipLight.position.copy(SHIP_LIGHT_AT).multiplyScalar(METRE).applyQuaternion(shipRoot.quaternion).add(shipRoot.position);
    cloud.update(t, sunlightAt(cloudRoot.position, world.sunDirection), boosterFlame * (1 - THREE.MathUtils.smoothstep(t, 3, 12)));
    boosterLight.position.copy(BOOSTER_LIGHT_AT).multiplyScalar(METRE).applyQuaternion(boosterRoot.quaternion).add(boosterRoot.position);

    // The payload door folds up into the bay; satellites wait in the stack and slide out one by one.
    ship.door.scale.y = 1 - 0.97 * state.door;
    for (let k = 0; k < DEPLOY_COUNT; k++) {
      const s = satelliteAt(k, t, SLOT_Y, tmp.sat);
      fleet.set(k, s.visible ? tmp.m.compose(s.pos, s.quat, tmp.one) : null, s.unfold);
    }
    fleet.commit();
    // The bay's lamps, on from a minute before the door opens.
    const lampOn = THREE.MathUtils.smoothstep(t, DOOR_OPEN_S - 60, DOOR_OPEN_S - 58);
    bay.glow.color.setScalar(0.06 + 0.94 * lampOn);
    lamps.forEach((l, i) => {
      l.intensity = BAY_LAMP * lampOn;
      l.position.copy(bay.lamps[i]).multiplyScalar(METRE).applyQuaternion(shipRoot.quaternion).add(shipRoot.position);
    });

    // Light: the Sun, unless the Earth is in the way; the Earth's (or sky's)
    // glow, turned so its ground is below this ship; and the engines.
    tmp.up.copy(shipRoot.position).normalize();
    sunlight.value = sunlightAt(shipRoot.position, world.sunDirection);
    const inSky = state.ship.altKm < SKY_TOP_KM;
    envRotationFor(tmp.up, tmp.euler);
    const brightness = environmentIntensity(tmp.up, world.sunDirection, inSky);
    for (const m of reflectiveMaterials()) {
      m.envMap = inSky ? envs.sky : envs.orbit;
      m.envMapRotation.copy(tmp.euler);
      m.envMapIntensity = brightness;
    }

    // Too small to see from here? Mark it.
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const px = (metres: number, at: THREE.Vector3) => (metres * METRE) / Math.max(1e-9, camera.position.distanceTo(at)) / tanHalf * (size.height / 2);
    const markScale = (MARKER_PX * 2 * tanHalf) / size.height;
    const shipPx = px(SHIP_HEIGHT_M, shipRoot.position);
    const marked = !follow && shipPx < MARK_BELOW_PX;
    shipMarker.visible = marked;
    shipMarker.position.copy(shipRoot.position);
    shipMarker.scale.setScalar(markScale);
    boosterMarker.visible = marked && t > STAGING_S + 20 && state.booster.visible && px(BOOSTER_HEIGHT_M, boosterRoot.position) < MARK_BELOW_PX;
    boosterMarker.position.copy(boosterRoot.position);
    boosterMarker.scale.setScalar(markScale * 0.75);

    // On one of the vehicles' own cameras (the booster's only while it flies)?
    const mountId = camRef.current;
    const mount = mountId === 'chase' ? null : onboardCam(mountId);
    const boosterFlying = boosterRoot.visible && t > 0;
    const onboard = follow && mount && (mount.vehicle === 'ship' || boosterFlying) ? mount : null;
    const lens = onboard ? onboard.fov : RIDE_FOV;
    if (follow && camera.fov !== lens) {
      camera.fov = lens;
      camera.updateProjectionMatrix();
    }

    if (onboard) {
      world.nearOverride = ONBOARD_NEAR;
      placeOnboardCamera(camera, onboard.vehicle === 'ship' ? shipRoot : boosterRoot, onboard);
    } else if (follow) {
      world.nearOverride = 0.5 * METRE;
      const up = tmp.up;
      // Travel direction: the ship's nose in flight, then east along the orbit.
      tmp.fwd.set(0, 1, 0).applyQuaternion(state.ship.quat);
      tmp.fwd.addScaledVector(up, -tmp.fwd.dot(up));
      if (tmp.fwd.lengthSq() < 1e-6) tmp.fwd.set(1, 0, 0).applyQuaternion(state.ship.quat);
      tmp.fwd.normalize();
      const releasing = t > DOOR_OPEN_S - 30;
      tmp.axis.set(0, 1, 0).applyQuaternion(state.ship.quat);
      // Look at the middle of the stack, then of the ship; while releasing, at
      // the slot and the line of satellites rising from it.
      if (t < STAGING_S) tmp.centre.copy(shipRoot.position).addScaledVector(tmp.axis, -10 * METRE);
      else tmp.centre.copy(shipRoot.position).addScaledVector(tmp.axis, (releasing ? SLOT_Y - 4 : 26) * METRE);
      if (releasing) tmp.centre.addScaledVector(tmp.offset.set(0, 0, 1).applyQuaternion(state.ship.quat), 45 * METRE);
      const distM = t < STAGING_S ? 330 : releasing ? 170 : 220;
      const v = view.current;
      if (!v.held) {
        // Until the viewer takes hold: circle slowly, and climb to look down at the release.
        v.azimuth += delta * 0.04;
        v.elevation = THREE.MathUtils.damp(v.elevation, releasing ? 0.5 : 0.12, 1.5, delta);
      }
      placeOrbitCamera(camera, tmp.centre, up, tmp.fwd, distM, v);
    }

    if (clock.elapsedTime - lastInfo.current > 0.25) {
      lastInfo.current = clock.elapsedTime;
      onInfo({
        phase: state.phase,
        t,
        altKm: state.ship.altKm,
        speedKms: state.ship.speed,
        deployed: state.deployed,
        unfolded: state.unfolded,
        inShadow: sunlight.value < 0.5,
        marked,
        boosterFlying
      });
    }
  });

  return (
    <>
      <primitive object={parts.root} />
      <primitive object={parts.lights} />
    </>
  );
};
