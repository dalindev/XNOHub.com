'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { buildStarship, buildSuperHeavy, SHIP_HEIGHT_M, BOOSTER_HEIGHT_M, SLOT_Y, BOOSTER_ENGINES, SHIP_ENGINES, ENGINE_INSIDES, BOOSTER_EXIT_Y } from '@/lib/models/starship-models';
import { makeNozzleGlow } from '@/lib/plume/nozzle-glow';
import { makePlume } from '@/lib/plume/plume-material';
import { makeStagingVents, VENT_Y } from '@/lib/plume/staging-vents';
import { boosterLook, newPlumeLook, shipLook } from '@/lib/plume/look';
import { makeFlameClock } from '@/lib/plume/flame-clock';
import { chaseFrame, newChaseFrame } from '@/lib/missions/starship-chase';
import { StarlinkV3Fleet } from '@/lib/models/starlink-v3';
import { makeExhaustCloud, padFrame } from '@/lib/models/exhaust-cloud';
import { buildPayloadBay, onboardCam, placeOnboardCamera, type OnboardCamId } from '@/lib/models/starship-onboard';
import { reflectiveMaterials, sunlight } from '@/lib/models/vehicle-materials';
import { makeOrbitEnvironment, makeSkyEnvironment, envRotationFor, environmentIntensity, sunlightAt, SKY_TOP_KM } from '@/lib/models/orbit-environment';
import {
  createMissionState,
  boosterGas,
  missionAt,
  satelliteAt,
  newSatellitePose,
  DEPLOY_COUNT,
  DOOR_OPEN_S,
  IGNITION_S,
  LAUNCH_FROM_S,
  MECO_S,
  BOOSTBACK_S,
  LANDING_BURN_S,
  PAD_GROUND_M,
  baseClearanceM,
  BOOSTER_HOME_S,
  SECO_S,
  MISSION_END_S,
  STAGING_S,
  PAD,
  type Phase
} from '@/lib/missions/starship';
import { METRE } from '@/lib/chase-camera';
import { ellipsoidRadius, latLonToUnit, surfaceRadiusGeocentric, geocentricLatitude } from '@/lib/geo';
import { useOrbitView, placeOrbitCamera, RIDE_FOV, type OrbitView } from '@/components/use-orbit-view';
import { world } from '@/lib/world';
import { METRE_LIGHTS } from '@/lib/metre-lights';

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

// The light the engines throw on the vehicle (and the ground at liftoff).
// Point lights measure distance in metres (lib/metre-lights), so intensity is
// the irradiance 1 m away. A plume is a long line of light, which falls off
// as 1/d, not 1/d²: about half the Sun's light 20 m from it, a tenth 100 m
// away (a 12 m wide plume at 1.5 sunlit white). The lights stay in the scene
// at zero when nothing burns, so lighting one up doesn't make every material
// in the scene rebuild its shader.
// (Off if three changed the line lib/metre-lights edits: unpatched, every
// light within 600 km would be a hundred times too bright.)
const engineLight = (color: number) => new THREE.PointLight(color, 0, 900 * METRE, 1);
const ENGINE_LIGHT = METRE_LIGHTS ? 23 : 0;
// Where each light sits: a few metres below the engines and out to the side
// the camera is on. A light on the axis can't reach the hull's sides (they
// face away from it), but a plume wider than the hull lights the lower hull
// all round; the camera only sees its own side of that.
const SHIP_LIGHT_BELOW = 6; // m below the hull's base
const BOOSTER_LIGHT_BELOW = 8;
const LIGHT_OUT = 11; // m out from the axis: 2.5 hull radii
// The payload bay's lamps for the dispenser camera: cool white LEDs, a few
// metres' reach, on from a minute before the door opens.
const BAY_LAMP = METRE_LIGHTS ? 4 : 0; // irradiance 1 m away: about a fifth of the Sun's at 3 m
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

/**
 * Dev: a camera somewhere fixed (a spot on the ground, or a place in a
 * vehicle's own frame, metres), aimed at a point on the vehicle's axis
 * (metres up from its base; below 0 is in its plume), with a lens (vertical
 * field of view, degrees). For checking the look against photos taken from
 * the same place.
 */
export interface Spotter {
  target?: 'booster' | 'ship';
  at?: { lat: number; lon: number; hM: number };
  rel?: [number, number, number];
  aim?: number;
  /** Aim at a spot on the ground instead (hM metres up). */
  look?: { lat: number; lon: number; hM: number };
  fov?: number;
}

// The ground at the pad: the drawn ellipsoid there (the map's relief is about 1 m at Starbase), and up.
function groundAt(out: { point: THREE.Vector3; up: THREE.Vector3 }) {
  latLonToUnit(PAD.lat, PAD.lon, out.up);
  out.point.copy(out.up).multiplyScalar(surfaceRadiusGeocentric(geocentricLatitude(PAD.lat)) + PAD_GROUND_M * METRE);
  return out;
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
  // Dev: hold the mission clock still; watch from a fixed spot; freeze the flames' turbulence.
  const held = useRef(false);
  const spot = useRef<Spotter | null>(null);
  const frozen = useRef<number | null>(null);
  const looks = useMemo(() => ({ booster: newPlumeLook(), ship: newPlumeLook(), meco: newPlumeLook() }), []);
  // Riding along, the camera is the viewer's: drag to look round the ship, scroll to zoom.
  const view = useOrbitView(follow, { azimuth: 1.1, elevation: 0.12, distance: 1 });
  const state = useMemo(() => createMissionState(), []);

  // One memo for every object, for the same reason as in StarlinkFollow: a
  // second run would move children into a group that is then thrown away.
  const parts = useMemo(() => {
    const ship = buildStarship();
    const booster = buildSuperHeavy();
    const shipGlow = makeNozzleGlow(ship.group, SHIP_ENGINES, ship.group.getObjectByName(ENGINE_INSIDES) as THREE.Mesh, 1);
    const boosterGlow = makeNozzleGlow(booster, BOOSTER_ENGINES, booster.getObjectByName(ENGINE_INSIDES) as THREE.Mesh);
    // The merged plumes, from each vehicle's exit plane (its lowest exits).
    const shipPlume = makePlume();
    const boosterPlume = makePlume();
    ship.group.add(shipPlume.mesh.translateY(Math.min(...SHIP_ENGINES.map((e) => e.exitY))));
    booster.add(boosterPlume.mesh.translateY(BOOSTER_EXIT_Y));
    // At MECO: the 33 engines' plume leaving the nozzles, while the centre 3 burn on.
    const mecoPlume = makePlume();
    booster.add(mecoPlume.mesh.translateY(BOOSTER_EXIT_Y));
    // Hot staging: the ship's exhaust out of the booster's ring.
    const vents = makeStagingVents();
    booster.add(vents.group);
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
    // The steam cloud out of the flame trench, on the ground at the pad, and
    // the trail the stack leaves higher up: where its engines are while it climbs.
    const pathState = createMissionState();
    const ventState = createMissionState();
    const up = new THREE.Vector3();
    const cloud = makeExhaustCloud(
      (sinceIgnition, out) => {
        const at = sinceIgnition + IGNITION_S;
        if (at >= STAGING_S) return false;
        missionAt(at, pathState);
        up.set(0, 1, 0).applyQuaternion(pathState.ship.quat);
        out.copy(pathState.ship.pos).addScaledVector(up, BOOSTER_EXIT_Y * METRE);
        return true;
      },
      // And hot staging's exhaust, out of the booster's ring wherever the booster is.
      {
        at: STAGING_S - IGNITION_S,
        ringAbove: VENT_Y - BOOSTER_EXIT_Y,
        ventsAt: (sinceIgnition, centre, axis) => {
          const at = sinceIgnition + IGNITION_S;
          missionAt(at, ventState);
          const b = at < STAGING_S ? ventState.ship : ventState.booster;
          axis.set(0, 1, 0).applyQuaternion(b.quat);
          centre.copy(b.pos).addScaledVector(axis, VENT_Y * METRE);
          return true;
        }
      }
    );
    const cloudRoot = padFrame(PAD.lat, PAD.lon, surfaceRadiusGeocentric(geocentricLatitude(PAD.lat)) + PAD_GROUND_M * METRE, new THREE.Group());
    cloudRoot.scale.setScalar(METRE);
    cloudRoot.add(cloud.group);
    const root = new THREE.Group();
    root.add(shipRoot, boosterRoot, shipMarker, boosterMarker, cloudRoot);
    root.visible = false;
    return { ship, booster, shipGlow, boosterGlow, shipPlume, boosterPlume, mecoPlume, vents, shipLight, boosterLight, bay, lamps, lights, fleet, shipRoot, boosterRoot, shipMarker, boosterMarker, cloud, cloudRoot, root };
  }, []);

  useEffect(
    () => () => {
      parts.fleet.dispose();
      parts.shipGlow.dispose();
      parts.boosterGlow.dispose();
      parts.shipPlume.dispose();
      parts.boosterPlume.dispose();
      parts.mecoPlume.dispose();
      parts.vents.dispose();
      parts.cloud.dispose();
    },
    [parts]
  );

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
    if (launchSignal > 0 && met.current === null) met.current = LAUNCH_FROM_S;
  }, [launchSignal]);

  // Dev: __xno.starship(seconds) jumps a flying mission to that many seconds after liftoff (mission time);
  // __xno.shipView({ azimuth, elevation, distance }) holds the follow camera there.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as { __xno?: Record<string, unknown> & { look?: { cut(): void } } };
    // A jump or a new camera is a cut for the camera look's exposure.
    const cut = () => w.__xno?.look?.cut();
    w.__xno = {
      ...(w.__xno ?? {}),
      starship: (seconds: number) => {
        met.current = seconds;
        cut();
      },
      shipView: (v: Partial<Omit<OrbitView, 'held'>>) => Object.assign(view.current, v, { held: true }),
      shipCam: (id: StarshipCam) => {
        camRef.current = id;
        cut();
      },
      hold: (on = true) => (held.current = on),
      spotter: (s: Spotter | null) => (spot.current = s),
      freezeFlames: (on = true) => (frozen.current = on ? 12.345 : null),
      flameInfo: () => ({ met: met.current, booster: { ...looks.booster }, ship: { ...looks.ship }, mecoPlume: parts.mecoPlume.mesh.visible, vents: parts.vents.group.visible, calls: gl.info.render.calls }),
      steam: () => parts.cloud.stats()
    };
  }, [view, looks, gl, parts]);

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
      centre: new THREE.Vector3(),
      offset: new THREE.Vector3(),
      axis: new THREE.Vector3(),
      euler: new THREE.Euler(),
      sat: newSatellitePose(),
      m: new THREE.Matrix4(),
      one: new THREE.Vector3(1, 1, 1),
      ground: { point: new THREE.Vector3(), up: new THREE.Vector3() },
      stagingClip: { point: new THREE.Vector3(), up: new THREE.Vector3() },
      side: new THREE.Vector3(),
      chase: newChaseFrame()
    }),
    []
  );
  const flameClock = useMemo(() => makeFlameClock(), []);

  /** Put an engine light `below` m under `hull`'s base, out toward the camera. */
  const placeEngineLight = (light: THREE.PointLight, hull: THREE.Object3D, below: number) => {
    const axis = tmp.axis.set(0, 1, 0).applyQuaternion(hull.quaternion);
    light.position.copy(hull.position).addScaledVector(axis, -below * METRE);
    const side = tmp.side.copy(camera.position).sub(light.position);
    side.addScaledVector(axis, -side.dot(axis));
    const out = side.length();
    if (out > 0) light.position.addScaledVector(side, Math.min(LIGHT_OUT * METRE, out / 2) / out);
  };

  useFrame(({ clock, size }, delta) => {
    const { root, shipRoot, boosterRoot, ship, shipGlow, boosterGlow, shipPlume, boosterPlume, mecoPlume, vents, booster, shipLight, boosterLight, bay, lamps, fleet, shipMarker, boosterMarker, cloud } = parts;
    if (met.current === null) {
      flameClock.reset();
      root.visible = false;
      shipLight.intensity = boosterLight.intensity = 0;
      for (const l of lamps) l.intensity = 0;
      return;
    }
    // A long frame (a hidden tab) doesn't jump the mission ahead.
    if (!held.current) met.current += Math.min(delta, 0.1) * speedRef.current;
    const t = met.current;
    if (t > MISSION_END_S) {
      met.current = null;
      flameClock.reset();
      root.visible = false;
      shipLight.intensity = boosterLight.intensity = 0;
      for (const l of lamps) l.intensity = 0;
      world.nearOverride = null;
      onInfo(null);
      return;
    }
    missionAt(t, state);
    root.visible = true;

    // The ship's path is the stack's (the booster's base); the ship itself
    // sits a booster's height up its own axis, stacked until hot staging and
    // parting slowly after it (lib/missions/starship).
    shipRoot.position.copy(state.ship.pos);
    shipRoot.quaternion.copy(state.ship.quat);
    tmp.offset.set(0, BOOSTER_HEIGHT_M * METRE, 0).applyQuaternion(state.ship.quat);
    shipRoot.position.add(tmp.offset);
    if (t < STAGING_S) {
      boosterRoot.position.copy(state.ship.pos);
      boosterRoot.quaternion.copy(state.ship.quat);
    } else {
      boosterRoot.position.copy(state.booster.pos);
      boosterRoot.quaternion.copy(state.booster.quat);
    }
    boosterRoot.visible = state.booster.visible;

    // The camera first: the flames, lights and steam below are placed and sorted for where it is now.
    // On one of the vehicles' own cameras (the booster's only while it flies)?
    const mountId = camRef.current;
    const mount = mountId === 'chase' ? null : onboardCam(mountId);
    const boosterFlying = boosterRoot.visible && t > 0;
    const onboard = follow && mount && (mount.vehicle === 'ship' || boosterFlying) ? mount : null;
    const spotter = follow ? spot.current : null;
    const lens = spotter?.fov ?? (onboard ? onboard.fov : RIDE_FOV);
    if (follow && camera.fov !== lens) {
      camera.fov = lens;
      camera.updateProjectionMatrix();
    }

    if (spotter) {
      world.nearOverride = 1 * METRE;
      const target = spotter.target === 'ship' ? shipRoot : boosterRoot;
      target.updateMatrixWorld();
      if (spotter.at) {
        const { lat, lon, hM } = spotter.at;
        latLonToUnit(lat, lon, camera.position).multiplyScalar(ellipsoidRadius(lat) + hM * METRE);
      } else camera.position.fromArray(spotter.rel ?? [60, 10, 0]).applyMatrix4(target.matrixWorld);
      camera.up.copy(camera.position).normalize();
      if (spotter.look) {
        const { lat, lon, hM } = spotter.look;
        camera.lookAt(latLonToUnit(lat, lon, tmp.centre).multiplyScalar(ellipsoidRadius(lat) + hM * METRE));
      } else camera.lookAt(tmp.centre.set(0, spotter.aim ?? 0, 0).applyMatrix4(target.matrixWorld));
    } else if (onboard) {
      world.nearOverride = ONBOARD_NEAR;
      placeOnboardCamera(camera, onboard.vehicle === 'ship' ? shipRoot : boosterRoot, onboard);
    } else if (follow) {
      world.nearOverride = 0.5 * METRE;
      const c = chaseFrame(t, shipRoot.position, state.ship.quat, tmp.chase);
      const v = view.current;
      if (!v.held) {
        // Until the viewer takes hold: circle slowly, and climb to look down at the release.
        v.azimuth += delta * 0.04;
        v.elevation = THREE.MathUtils.damp(v.elevation, c.releasing ? 0.5 : 0.12, 1.5, delta);
      }
      placeOrbitCamera(camera, c.centre, c.up, c.fwd, c.distM, v);
    }


    shipGlow.update(state.ship.lit);
    boosterGlow.update(state.booster.lit);
    // The plumes: their look by height and engines burning; the gas reaching out from the nozzles after
    // ignition and leaving them after cutoff (at about 800 m/s); the ground under them near the pad.
    const fxTime = frozen.current ?? flameClock.at(clock.elapsedTime);
    const sunlitHere = sunlightAt(boosterRoot.position, world.sunDirection);
    const boosterLit = state.booster.flame * 33;
    const landing = t > LANDING_BURN_S - 1;
    const gas = boosterGas(t);
    const near = state.booster.altKm < 3;
    // From MECO to the boost-back only the centre 3 burn: their plume stays on
    // the nozzles, and the 33's leaves them (below) as the others go out.
    const sinceMeco = t - MECO_S;
    const plumeLit = sinceMeco >= 0 && t < BOOSTBACK_S[0] ? Math.min(boosterLit, 3) : boosterLit;
    boosterPlume.update({
      look: boosterLook(state.booster.altKm, plumeLit, landing, looks.booster),
      camera,
      time: fxTime,
      sunDirection: world.sunDirection,
      sunlit: sunlitHere,
      ground: near ? groundAt(tmp.ground) : null,
      reach: Math.max(0, (t - gas.on) * 800),
      cutoff: Math.max(0, (t - gas.off) * 800)
    });
    if (sinceMeco >= 0 && sinceMeco < 1) {
      mecoPlume.update({
        look: boosterLook(state.booster.altKm, 33, false, looks.meco),
        camera,
        time: fxTime,
        sunDirection: world.sunDirection,
        sunlit: sunlitHere,
        ground: null,
        reach: 1e6,
        cutoff: sinceMeco * 800
      });
    } else mecoPlume.mesh.visible = false;
    // Hot staging: how far the ship's base is above the booster's top, and
    // whether the booster still faces it (it flips away from 2 s on).
    booster.updateWorldMatrix(true, false);
    const shipBase = booster.worldToLocal(tmp.centre.copy(shipRoot.position));
    const gap = shipBase.y - BOOSTER_HEIGHT_M;
    tmp.axis.set(0, 1, 0).applyQuaternion(boosterRoot.quaternion);
    const facing = tmp.side.set(0, 1, 0).applyQuaternion(shipRoot.quaternion).dot(tmp.axis);
    const staging = t >= STAGING_S && gap < 10 && facing > 0.5 && boosterRoot.visible;
    vents.update({ camera, since: t - STAGING_S, time: fxTime, flame: boosterRoot.visible ? state.ship.flame : 0, gap, facing });
    // While it is that close, the ship's exhaust goes out sideways off the
    // booster's top: none of it carries on past it.
    if (staging) {
      tmp.stagingClip.up.copy(tmp.axis);
      tmp.stagingClip.point.copy(boosterRoot.position).addScaledVector(tmp.axis, BOOSTER_HEIGHT_M * METRE);
    }
    shipPlume.update({
      look: shipLook(state.ship.altKm, state.ship.flame * 6, looks.ship),
      camera,
      time: fxTime,
      sunDirection: world.sunDirection,
      sunlit: sunlightAt(shipRoot.position, world.sunDirection),
      ground: staging ? tmp.stagingClip : null,
      reach: Math.max(0, (t - STAGING_S) * 800),
      cutoff: Math.max(0, (t - SECO_S) * 800)
    });
    const flicker = 0.97 + Math.sin(fxTime * 43) * 0.02 + Math.sin(fxTime * 71.3) * 0.01;
    const boosterFlame = Math.min(1, state.booster.flame);
    shipLight.intensity = ENGINE_LIGHT * 0.35 * state.ship.flame * flicker;
    boosterLight.intensity = ENGINE_LIGHT * boosterFlame * flicker * (boosterRoot.visible ? 1 : 0);
    placeEngineLight(shipLight, shipRoot, SHIP_LIGHT_BELOW);
    // The steam and the trail, lit by the booster's flame where it is near them.
    tmp.axis.set(0, 1, 0).applyQuaternion(boosterRoot.quaternion);
    cloud.update({
      t: t - IGNITION_S,
      camera,
      sunDirection: world.sunDirection,
      flame: boosterFlame,
      exits: tmp.offset.copy(boosterRoot.position).addScaledVector(tmp.axis, BOOSTER_EXIT_Y * METRE),
      axis: tmp.axis,
      plumeLength: looks.booster.length
    });
    // Never under the ground on the pad: at least 3 m up.
    placeEngineLight(boosterLight, boosterRoot, Math.min(BOOSTER_LIGHT_BELOW, Math.max(0, baseClearanceM(state.booster.altKm) - 3)));

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
