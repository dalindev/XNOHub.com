'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CablesFile } from '@/lib/routing/fiber';
import { surfacePolyline } from '@/lib/routing/polyline';
import { latLonToUnit } from '@/lib/geo';
import { netMode } from '@/lib/network-mode';
import { world } from '@/lib/world';

// Every submarine cable as one faint line set, plus landing stations as tiny
// dots. Packets travelling the cables are drawn by NetworkPackets on top.

export const CableLines: React.FC<{ data: CablesFile }> = ({ data }) => {
  const { lines, dots } = useMemo(() => {
    const pos: number[] = [];
    for (const [, line] of data.lines) {
      const pts = surfacePolyline(line.map(([lon, lat]) => ({ lat, lon })), 1.0008);
      for (let i = 1; i < pts.length; i++) pos.push(pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, pts[i].x, pts[i].y, pts[i].z);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(
      lg,
      new THREE.LineBasicMaterial({ color: 0x2fb5a8, transparent: true, opacity: 0.28, depthWrite: false })
    );

    const dp = new Float32Array(data.landings.length * 3);
    const v = new THREE.Vector3();
    data.landings.forEach(([lon, lat], i) => latLonToUnit(lat, lon, v).multiplyScalar(1.001).toArray(dp, i * 3));
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const dots = new THREE.Points(
      dg,
      new THREE.PointsMaterial({ color: 0x7fe0d4, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false })
    );
    lines.renderOrder = dots.renderOrder = 1;
    return { lines, dots };
  }, [data]);

  useEffect(
    () => () => {
      for (const o of [lines, dots]) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    },
    [lines, dots]
  );

  useFrame(() => {
    const show = netMode.get().showCables;
    lines.visible = dots.visible = show;
    // Fade out close to the ground, where the lines would be hundreds of metres wide in effect.
    const fade = THREE.MathUtils.smoothstep(world.altitude, 0.01, 0.25);
    (lines.material as THREE.LineBasicMaterial).opacity = 0.28 * fade;
    (dots.material as THREE.PointsMaterial).opacity = 0.6 * fade;
  });

  return (
    <>
      <primitive object={lines} />
      <primitive object={dots} />
    </>
  );
};
