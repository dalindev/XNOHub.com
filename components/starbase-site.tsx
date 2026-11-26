'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { world } from '@/lib/world';
import { KM } from '@/lib/geo';
import { siteFrame } from '@/lib/sites/frame';
import { GROUND_M, ORIGIN, SITE_DATE } from '@/lib/sites/starbase';
import { reflectiveSiteMaterials, siteLight } from '@/lib/models/site-materials';
import { makeSkyEnvironment, envRotationFor, environmentIntensity, sunlightAt } from '@/lib/models/orbit-environment';
import { buildTowers } from '@/lib/models/starbase-towers';
import { buildPads } from '@/lib/models/starbase-pads';
import { buildFarm } from '@/lib/models/starbase-farm';

/** Drawn only with the camera this close (scene units): nothing of it shows from further out. */
const SHOW_WITHIN = 60 * KM;

const SKY = new THREE.Color(0.2, 0.24, 0.31);
const GROUND = new THREE.Color(0.11, 0.1, 0.085);

/**
 * Starbase, Texas, as of November 2026, at true scale: the towers, the
 * launch mounts and flame trenches, the tank farm and the buildings, standing
 * on the ground the map draws there (lib/sites/starbase.ts has where each
 * thing is and where that comes from). Lit like the vehicles: the Sun when it
 * is up at the pad, its sky, and the engines' light at launch.
 */
export function StarbaseSite() {
  const gl = useThree((s) => s.gl);
  const frame = useMemo(() => siteFrame(ORIGIN.lat, ORIGIN.lon, GROUND_M), []);
  const root = useMemo(() => {
    const g = new THREE.Group();
    g.name = 'starbase';
    g.matrixAutoUpdate = false;
    g.matrix.copy(frame.matrix);
    g.add(buildTowers(), buildPads(), buildFarm());
    g.visible = false;
    return g;
  }, [frame]);
  const env = useMemo(() => makeSkyEnvironment(gl), [gl]);
  useEffect(() => {
    for (const m of reflectiveSiteMaterials()) {
      m.envMap = env;
      envRotationFor(frame.up, m.envMapRotation);
    }
    return () => env.dispose();
  }, [env, frame]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as { __xno?: Record<string, unknown> };
    w.__xno = {
      ...(w.__xno ?? {}),
      site: {
        root,
        check: () => {
          let triangles = 0, drawCalls = 0;
          root.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            drawCalls++;
            const g = m.geometry;
            const n = g.index ? g.index.count : g.attributes.position.count;
            triangles += (n / 3) * ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1);
          });
          return { visible: root.visible, asOf: SITE_DATE, triangles, drawCalls, parts: root.children.map((c) => ({ name: c.name, ...c.userData.check })) };
        }
      }
    };
  }, [root]);

  useFrame(({ camera }) => {
    root.visible = camera.position.distanceTo(frame.origin) < SHOW_WITHIN;
    if (!root.visible) return;
    const sun = world.sunDirection;
    // The Sun's height at the pad: its light, the sky's and what the ground throws back.
    const e = frame.up.dot(sun);
    const day = THREE.MathUtils.smoothstep(e, -0.1, 0.3);
    siteLight.sunlight.value = sunlightAt(frame.origin, sun) * THREE.MathUtils.smoothstep(e, -0.01, 0.02);
    siteLight.sky.value.copy(SKY).multiplyScalar(day);
    siteLight.ground.value.copy(GROUND).multiplyScalar(day * (0.4 + 0.6 * Math.max(0, e)));
    siteLight.upView.value.copy(frame.up).transformDirection(camera.matrixWorldInverse);
    const brightness = environmentIntensity(frame.up, sun, true);
    for (const m of reflectiveSiteMaterials()) m.envMapIntensity = brightness;
  });

  return <primitive object={root} />;
}
