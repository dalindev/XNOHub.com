'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { buildStarship, buildSuperHeavy, SHIP_HEIGHT_M, BOOSTER_HEIGHT_M } from '@/lib/models/starship-models';
import { buildStarlink } from '@/lib/models/starlink-models';
import {
  createMissionState,
  missionAt,
  DEPLOY_S,
  DEPLOY_EVERY_S,
  DEPLOY_COUNT,
  MISSION_END_S,
  type Phase
} from '@/lib/missions/starship';
import { chase, METRE } from '@/lib/chase-camera';
import { world } from '@/lib/world';

// One Starship mission at a time: stack lifts off from Starbase, hot-stages,
// the booster flies home, the ship reaches orbit and releases V3 Starlinks.
// True scale when the camera rides along; from far away the vehicles are
// drawn bigger (and marked "not to scale") so they can be found at all.

export interface MissionInfo {
  phase: Phase;
  t: number;
  altKm: number;
  compression: number;
  deployed: number;
  enlarged: boolean;
}

interface Props {
  /** Bump to launch (ignored while a mission is flying). */
  launchSignal: number;
  /** Camera rides along with the ship. */
  follow: boolean;
  onInfo: (info: MissionInfo | null) => void;
}

function flame(radius: number, length: number, color: number) {
  const g = new THREE.ConeGeometry(radius, length, 20, 1, true).rotateX(Math.PI).translate(0, -length / 2, 0);
  const m = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(g, m);
}

export const StarshipMission: React.FC<Props> = ({ launchSignal, follow, onInfo }) => {
  const camera = useThree((s) => s.camera);
  const start = useRef<number | null>(null);
  const state = useMemo(() => createMissionState(), []);

  const parts = useMemo(() => {
    const ship = buildStarship();
    const booster = buildSuperHeavy();
    const shipFlame = flame(3.2, 28, 0xffa040);
    const boosterFlame = flame(5, 45, 0xff8a30);
    ship.group.add(shipFlame);
    booster.add(boosterFlame);
    const shipRoot = new THREE.Group();
    const boosterRoot = new THREE.Group();
    // Ship sits on top of the booster; each root's origin is its own base.
    shipRoot.add(ship.group);
    boosterRoot.add(booster);
    const sats = Array.from({ length: DEPLOY_COUNT }, () => {
      const s = buildStarlink(3);
      s.visible = false;
      ship.group.add(s); // ship-local coordinates (metres)
      return s;
    });
    const root = new THREE.Group();
    root.add(shipRoot, boosterRoot);
    root.visible = false;
    return { ship, booster, shipFlame, boosterFlame, shipRoot, boosterRoot, sats, root };
  }, []);

  useEffect(() => {
    if (launchSignal > 0 && start.current === null) start.current = performance.now() / 1000;
  }, [launchSignal]);

  useEffect(() => {
    if (!follow) world.nearOverride = null;
    return () => {
      world.nearOverride = null;
    };
  }, [follow]);

  const lastInfo = useRef(0);
  const up = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const centre = useMemo(() => new THREE.Vector3(), []);
  const stackOffset = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const { root, shipRoot, boosterRoot, ship, shipFlame, boosterFlame, sats } = parts;
    if (start.current === null) {
      root.visible = false;
      return;
    }
    const t = performance.now() / 1000 - start.current;
    if (t > MISSION_END_S) {
      start.current = null;
      root.visible = false;
      world.nearOverride = null;
      onInfo(null);
      return;
    }
    missionAt(t, state);
    root.visible = true;

    // From far away, scale the vehicles up so they're ~3% of the view.
    const dist = camera.position.distanceTo(state.ship.pos);
    const scale = follow ? 1 : Math.max(1, (0.03 * dist) / (SHIP_HEIGHT_M * METRE));
    const enlarged = scale > 1.01;

    shipRoot.position.copy(state.ship.pos);
    shipRoot.quaternion.copy(state.ship.quat);
    shipRoot.scale.setScalar(METRE * scale);
    if (t < 26) {
      // Stacked: the ship rides on top of the booster.
      boosterRoot.position.copy(state.ship.pos);
      boosterRoot.quaternion.copy(state.ship.quat);
      stackOffset.set(0, BOOSTER_HEIGHT_M, 0).applyQuaternion(state.ship.quat).multiplyScalar(METRE * scale);
      shipRoot.position.add(stackOffset);
    } else {
      boosterRoot.position.copy(state.booster.pos);
      boosterRoot.quaternion.copy(state.booster.quat);
    }
    boosterRoot.scale.setScalar(METRE * scale);
    boosterRoot.visible = state.booster.visible;

    const flicker = 0.9 + Math.sin(clock.elapsedTime * 40) * 0.05 + Math.random() * 0.05;
    shipFlame.visible = state.ship.flame > 0.01;
    shipFlame.scale.set(1, state.ship.flame * flicker, 1);
    boosterFlame.visible = state.booster.flame > 0.01;
    boosterFlame.scale.set(1, Math.min(1, state.booster.flame) * flicker, 1);

    // PEZ door swings open; V3 satellites slide out and drift away.
    ship.door.rotation.x = -state.door * 1.9;
    sats.forEach((s, k) => {
      const age = t - (DEPLOY_S + k * DEPLOY_EVERY_S);
      s.visible = age >= 0 && k < state.deployed;
      if (!s.visible) return;
      // Slides out flat, drifts off at ~2 m/s, then unfolds its arrays.
      const out = 2 * age;
      s.position.copy(ship.slotPosition).add(new THREE.Vector3(Math.sin(k * 2.3) * 0.15 * age, -0.6 * age, out));
      s.rotation.set(age * 0.015, age * 0.02 * (k % 2 ? 1 : -1), 0);
      const unfold = THREE.MathUtils.smoothstep(age, 5, 12);
      s.children.forEach((c) => {
        if (c.userData.part === 'solar') c.scale.set(Math.max(0.02, unfold), 1, 1);
      });
    });

    if (follow) {
      world.nearOverride = 0.5 * METRE;
      up.copy(state.ship.pos).normalize();
      // Travel direction: the ship's nose in flight, then east along the orbit.
      fwd.set(0, 1, 0).applyQuaternion(state.ship.quat);
      fwd.addScaledVector(up, -fwd.dot(up));
      if (fwd.lengthSq() < 1e-6) fwd.set(1, 0, 0).applyQuaternion(state.ship.quat);
      fwd.normalize();
      centre.copy(t < 26 ? state.ship.pos : shipRoot.position);
      centre.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(state.ship.quat), 26 * METRE);
      const deploying = t > DEPLOY_S - 4;
      const distM = t < 26 ? 330 : deploying ? 150 : 200;
      chase(camera, centre, up, fwd, distM, 1.1 + clock.elapsedTime * 0.04, deploying ? 0.8 : 0.25);
    }

    if (clock.elapsedTime - lastInfo.current > 0.25) {
      lastInfo.current = clock.elapsedTime;
      onInfo({
        phase: state.phase,
        t,
        altKm: state.ship.altKm,
        compression: state.compression,
        deployed: state.deployed,
        enlarged
      });
    }
  });

  return <primitive object={parts.root} />;
};
