'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CablesFile } from '@/lib/routing/fiber';
import { surfacePolyline } from '@/lib/routing/polyline';
import { latLonToUnit } from '@/lib/geo';
import { settings } from '@/lib/settings';
import { world } from '@/lib/world';

// Every submarine cable as one faint line set, plus landing stations as tiny
// dots. Packets travelling the cables are drawn by NetworkPackets on top.

const CABLE_LIFT = 1.0018; // ~11 km up: clear of terrain and the ellipsoid bulge when tiles are showing

const vertex = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uSize;
  varying float vDay;
  void main() {
    // Against the dark side the lines stand out far more: draw them fainter there.
    vDay = smoothstep(-0.15, 0.2, dot(normalize(position), uSunDir));
    gl_PointSize = uSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vDay;
  void main() {
    gl_FragColor = vec4(uColor, uOpacity * mix(0.5, 1.0, vDay));
  }
`;

// Colours are given as they should appear on screen (the shader writes them as is).
const material = (hex: number) =>
  new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uColor: { value: new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace) },
      uOpacity: { value: 0 },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uSize: { value: 2 }
    },
    transparent: true,
    depthWrite: false
  });

export const CableLines: React.FC<{ data: CablesFile }> = ({ data }) => {
  const { lines, dots } = useMemo(() => {
    const pos: number[] = [];
    for (const [, line] of data.lines) {
      const pts = surfacePolyline(line.map(([lon, lat]) => ({ lat, lon })), CABLE_LIFT);
      for (let i = 1; i < pts.length; i++) pos.push(pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, pts[i].x, pts[i].y, pts[i].z);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(lg, material(0x2fb5a8));

    const dp = new Float32Array(data.landings.length * 3);
    const v = new THREE.Vector3();
    data.landings.forEach(([lon, lat], i) => latLonToUnit(lat, lon, v).multiplyScalar(CABLE_LIFT + 0.0002).toArray(dp, i * 3));
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const dots = new THREE.Points(dg, material(0x7fe0d4));
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

  useFrame((state) => {
    const show = settings.get().cables;
    lines.visible = dots.visible = show;
    // Fade out close to the ground, where the lines would be hundreds of metres wide in effect.
    const fade = THREE.MathUtils.smoothstep(world.altitude, 0.01, 0.25);
    const lu = (lines.material as THREE.ShaderMaterial).uniforms;
    const du = (dots.material as THREE.ShaderMaterial).uniforms;
    lu.uOpacity.value = 0.28 * fade;
    du.uOpacity.value = 0.6 * fade;
    du.uSize.value = 2 * state.viewport.dpr;
    lu.uSunDir.value.copy(world.sunDirection);
    du.uSunDir.value.copy(world.sunDirection);
  });

  return (
    <>
      <primitive object={lines} />
      <primitive object={dots} />
    </>
  );
};
