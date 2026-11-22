'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { constellation, satScene } from '@/lib/constellation';
import { sunFix } from '@/lib/astro';
import { eciAt, eciToScene, siderealAngle, periodMinutes } from '@/lib/orbits';
import { simNowMs } from '@/lib/sim-clock';
import { buildStarlink, STARLINK_SPAN_M, type StarlinkVersion } from '@/lib/models/starlink-models';
import { METRE } from '@/lib/chase-camera';
import { unitToLatLon, EARTH_RADIUS_KM } from '@/lib/geo';
import { world } from '@/lib/world';

// Starlink view: ride along with one real satellite from the live
// constellation, at true scale and in real (sim) time, ~94 minutes per orbit.
// The model is the procedural one for the satellite's estimated version.
//
// The camera is yours: drag to look round the satellite, scroll to move in and
// out. It starts above and behind, looking down past the satellite at the
// Earth sliding by, through a wider lens than the globe view, and drifts
// slowly round until you take hold of it.

const RIDE_FOV = 62; // degrees; the globe view uses 45
const START = { azimuth: 0.45, elevation: 0.42, distance: 1.5 }; // radians, radians, model spans

export interface StarlinkInfo {
  norad: number;
  version: StarlinkVersion;
  altKm: number;
  speedKms: number;
  periodMin: number;
  lat: number;
  lon: number;
}

interface Props {
  active: boolean;
  /** Bump to jump to another satellite (cycles V2 Mini → V1.5 → V1.0). */
  pick: number;
  onInfo: (info: StarlinkInfo | null) => void;
}

const CYCLE: StarlinkVersion[] = [2, 1, 0];

export const StarlinkFollow: React.FC<Props> = ({ active, pick, onInfo }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const canvas = useThree((s) => s.gl.domElement);
  const sat = useRef(-1);
  const view = useRef({ ...START, held: false });

  // Drag to orbit the satellite, scroll to zoom; a wider lens while riding.
  useEffect(() => {
    if (!active) return;
    const before = camera.fov;
    camera.fov = RIDE_FOV;
    camera.updateProjectionMatrix();
    Object.assign(view.current, START, { held: false });
    let dragging = false;
    const down = () => {
      dragging = true;
      view.current.held = true;
    };
    const up = () => (dragging = false);
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const v = view.current;
      v.azimuth -= e.movementX * 0.005;
      v.elevation = THREE.MathUtils.clamp(v.elevation + e.movementY * 0.005, -1.4, 1.4);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = view.current;
      v.held = true;
      v.distance = THREE.MathUtils.clamp(v.distance * Math.exp(e.deltaY * 0.001), 0.8, 40);
    };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
      canvas.removeEventListener('wheel', wheel);
      camera.fov = before;
      camera.updateProjectionMatrix();
    };
  }, [active, camera, canvas]);
  // One memo for models and their parent: React may run a memo twice in dev,
  // and a second memo would move the models into a group that's then discarded.
  const { models, root } = useMemo(() => {
    const models = new Map<StarlinkVersion, THREE.Group>();
    const root = new THREE.Group();
    for (const v of [0, 1, 2] as StarlinkVersion[]) {
      const g = buildStarlink(v);
      g.scale.setScalar(METRE);
      g.visible = false;
      models.set(v, g);
      root.add(g);
    }
    return { models, root };
  }, []);

  useEffect(() => {
    if (!active) {
      sat.current = -1;
      world.nearOverride = null;
      onInfo(null);
      return;
    }
    const rows = constellation.rows;
    const want = CYCLE[pick % CYCLE.length];
    // Operational shells only (not the ones still raising orbit), and in
    // sunlight when there's a choice: a satellite in Earth's shadow is black.
    const ops = rows.map((r, i) => (r[1] === want && r[2] - 6378 > 330 ? i : -1)).filter((i) => i >= 0);
    const sun = sunFix(new Date(simNowMs())).direction;
    const v = new THREE.Vector3();
    const lit = ops.filter((i) => satScene(i, v).normalize().dot(sun) > 0.35);
    const pool = lit.length ? lit : ops;
    sat.current = pool.length ? pool[Math.floor(Math.random() * pool.length)] : rows.length ? 0 : -1;
    return () => {
      world.nearOverride = null;
    };
  }, [active, pick, onInfo]);

  const pos = useMemo(() => new THREE.Vector3(), []);
  const next = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const lastInfo = useRef(0);
  const tmp = useMemo(() => [0, 0, 0], []);

  useFrame(({ clock }, delta) => {
    const i = sat.current;
    models.forEach((m) => (m.visible = false));
    if (!active || i < 0 || !constellation.rows[i]) return;
    const row = constellation.rows[i];
    const now = simNowMs();
    const dt = (now - constellation.epochMs) / 1000;
    eciAt(row, dt, tmp);
    const [x0, y0, z0] = tmp;
    eciToScene(x0, y0, z0, siderealAngle(new Date(now)), pos);
    eciAt(row, dt + 1, tmp);
    const speedKms = Math.hypot(tmp[0] - x0, tmp[1] - y0, tmp[2] - z0); // inertial, km per s
    eciToScene(tmp[0], tmp[1], tmp[2], siderealAngle(new Date(now + 1000)), next);

    up.copy(pos).normalize();
    fwd.subVectors(next, pos);
    fwd.addScaledVector(up, -fwd.dot(up)).normalize();
    const version = row[1] as StarlinkVersion;
    const m = models.get(version) ?? models.get(2)!;
    m.visible = true;
    m.position.copy(pos);
    const x = new THREE.Vector3().crossVectors(up, fwd).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, fwd));

    const span = STARLINK_SPAN_M(version);
    world.nearOverride = 0.5 * METRE;
    const v = view.current;
    if (!v.held) v.azimuth += delta * 0.03; // a slow drift until the viewer takes hold
    const flat = Math.cos(v.elevation);
    camera.position
      .copy(pos)
      .addScaledVector(fwd, -Math.cos(v.azimuth) * flat * span * v.distance * METRE)
      .addScaledVector(x, Math.sin(v.azimuth) * flat * span * v.distance * METRE)
      .addScaledVector(up, Math.sin(v.elevation) * span * v.distance * METRE);
    camera.up.copy(up);
    camera.lookAt(pos);

    if (clock.elapsedTime - lastInfo.current > 0.5) {
      lastInfo.current = clock.elapsedTime;
      const ll = unitToLatLon(pos);
      onInfo({
        norad: row[0],
        version,
        altKm: pos.length() * EARTH_RADIUS_KM - EARTH_RADIUS_KM,
        speedKms,
        periodMin: periodMinutes(row),
        lat: ll.lat,
        lon: ll.lon
      });
    }
  });

  return <primitive object={root} />;
};
