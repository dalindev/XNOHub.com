'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { RepNode } from '@/types/index';
import NetworkArcs, { type ArcNodes } from '@/components/network-arcs';
import { latLonToUnit } from '@/lib/geo';
import { markerScale } from '@/lib/world';
import { packetClock, takeDuePulses } from '@/lib/node-pulse';

// Each representative node is a small glowing pad lying on the ground where
// the node is: a bright core, and a ring whose size shows its voting weight.
// When a packet leaves or arrives, a ring pulses outward in the packet's
// colour. Pads are a fixed size on screen (they are markers, not buildings),
// so they never tower over the Earth and never shrink out of sight; when the
// camera pulls far back they shrink with the Earth so they never outgrow it.
//
// One instanced quad, one draw call. Hovering is found in screen space.

export const NODE_LIFT = 1.0022; // just above terrain and the ellipsoid bulge
const EXTENT = 2.6; // quad half-size in pad radii: room for the pulse ring
const PULSE_SECONDS = 1.1;

/** Pad radius in CSS pixels for a share of the online voting weight. */
export const padRadiusPx = (weightPercent: number) => 5 + 13 * Math.sqrt(Math.min(Math.max(weightPercent, 0), 30) / 30);

const vertex = /* glsl */ `
  uniform float uPixel; // world size of one pixel at distance 1
  uniform float uScale; // markers shrink with the Earth when the camera pulls back (lib/world markerScale)
  uniform float uTime;
  attribute vec2 aCorner;
  attribute vec3 iCenter;
  attribute vec4 iLook;  // radius px, online, hover, phase
  attribute vec4 iPulse; // start time, rgb
  varying vec2 vP;
  varying vec4 vLook;
  varying vec4 vPulse;   // age 0..1 (outside: none), rgb
  void main() {
    vec3 n = normalize(iCenter);
    vec3 centre = n * ${NODE_LIFT};
    vec4 mv = modelViewMatrix * vec4(centre, 1.0);
    float radius = iLook.x * uScale * (1.0 + 0.3 * iLook.z) * uPixel * -mv.z;

    // Lying on the ground, tilted a little toward the camera so a pad near
    // the limb stays a visible ellipse instead of a hairline.
    vec3 tilt = normalize(mix(n, normalize(cameraPosition - centre), 0.25));
    vec3 e1 = normalize(cross(abs(tilt.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), tilt));
    vec3 e2 = cross(tilt, e1);
    vec3 p = centre + (e1 * aCorner.x + e2 * aCorner.y) * radius * ${EXTENT.toFixed(1)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);

    vP = aCorner * ${EXTENT.toFixed(1)};
    vLook = vec4(iLook.x * uScale, iLook.yzw);
    vPulse = vec4((uTime - iPulse.x) / ${PULSE_SECONDS.toFixed(1)}, iPulse.yzw);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vP;
  varying vec4 vLook;
  varying vec4 vPulse;
  void main() {
    float r = length(vP); // 1 = the pad's radius
    float px = 1.0 / vLook.x; // one pixel, in pad radii
    float online = vLook.y;
    float hover = vLook.z;

    float core = 1.0 - smoothstep(0.34 - px, 0.34 + px, r);
    float glow = exp(-r * r * 2.6);
    float breathe = 0.85 + 0.15 * sin(uTime * 1.3 + vLook.w);
    float ring = (1.0 - smoothstep(0.3 * px, 1.3 * px, abs(r - 1.0))) * breathe;

    vec3 blue = vec3(0.16, 0.6, 1.0);
    vec3 white = vec3(0.92, 0.97, 1.0);
    vec3 col = white * core + blue * glow * 0.55 + mix(blue, white, 0.45 + 0.55 * hover) * ring * (0.65 + 0.35 * hover);
    float alpha = max(core, max(ring * (0.6 + 0.4 * hover), glow * 0.3));

    // Offline nodes: a dim grey dot, no ring.
    vec3 offCol = vec3(0.42, 0.47, 0.54) * (core + glow * 0.25);
    float offAlpha = max(core * 0.7, glow * 0.15);
    col = mix(offCol, col, online);
    alpha = mix(offAlpha, alpha, online);

    // Pulse: a ring racing outward, and the core flaring, in the packet's colour.
    float a = vPulse.x;
    if (a > 0.0 && a < 1.0) {
      float reach = mix(0.5, ${(EXTENT - 0.2).toFixed(1)}, 1.0 - (1.0 - a) * (1.0 - a));
      float wave = (1.0 - smoothstep(0.3 * px, 1.8 * px, abs(r - reach))) * (1.0 - a) * (1.0 - a);
      float flare = exp(-r * r * 1.6) * pow(1.0 - a, 3.0);
      col += vPulse.yzw * (wave * 0.9 + flare * 0.9);
      alpha = max(alpha, max(wave * 0.7, flare * 0.7));
    }

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha); // premultiplied: glows add, cores cover
  }
`;

interface NanoRepNodesProps {
  reps: RepNode[];
  onNodeHover: (rep: RepNode | null) => void;
}

const NanoRepNodes: React.FC<NanoRepNodesProps> = ({ reps, onNodeHover }) => {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const hovered = useRef(-1);

  const drawn = useMemo(() => reps.filter((r) => r.lat !== null && r.lon !== null), [reps]);

  const arcNodes = useMemo<ArcNodes>(() => {
    const directions = new Float32Array(drawn.length * 3);
    const indexByAccount = new Map<string, number>();
    drawn.forEach((r, i) => {
      latLonToUnit(r.lat!, r.lon!).toArray(directions, i * 3);
      indexByAccount.set(r.account, i);
    });
    return { directions, indexByAccount };
  }, [drawn]);

  const { mesh, material, look, pulse } = useMemo(() => {
    const n = Math.max(1, drawn.length);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    geo.setAttribute('aCorner', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const centre = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const look = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    const pulse = new THREE.InstancedBufferAttribute(new Float32Array(n * 4).fill(-1e6), 4).setUsage(THREE.DynamicDrawUsage);
    drawn.forEach((r, i) => {
      centre.set(arcNodes.directions.subarray(i * 3, i * 3 + 3), i * 3);
      look.set([padRadiusPx(r.weightPercent), r.online ? 1 : 0, 0, (i * 2.399) % 6.283], i * 4);
    });
    geo.setAttribute('iCenter', centre);
    geo.setAttribute('iLook', look);
    geo.setAttribute('iPulse', pulse);
    geo.instanceCount = drawn.length;
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uPixel: { value: 0.001 }, uScale: { value: 1 }, uTime: { value: 0 } },
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 4.5; // over the light trails, under the packet heads
    return { mesh, material, look, pulse };
  }, [drawn, arcNodes]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      material.dispose();
    },
    [mesh, material]
  );

  // Hover (or tap) the nearest pad under the pointer, skipping ones behind the Earth.
  useEffect(() => {
    const el = gl.domElement;
    const v = new THREE.Vector3();
    const setHover = (i: number) => {
      if (i === hovered.current) return;
      if (hovered.current >= 0) look.setZ(hovered.current, 0);
      if (i >= 0) look.setZ(i, 1);
      look.needsUpdate = true;
      hovered.current = i;
      el.style.cursor = i >= 0 ? 'pointer' : '';
      onNodeHover(i >= 0 ? drawn[i] : null);
    };
    const pick = (e: PointerEvent) => {
      if (e.type === 'pointermove' && e.buttons) return; // dragging the globe
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      let best = -1, bestD = Infinity;
      for (let i = 0; i < drawn.length; i++) {
        v.fromArray(arcNodes.directions, i * 3);
        if (v.dot(camera.position) < 1) continue; // beyond the horizon
        v.multiplyScalar(NODE_LIFT).project(camera);
        const d = Math.hypot((v.x * 0.5 + 0.5) * rect.width - x, (-v.y * 0.5 + 0.5) * rect.height - y);
        if (d < Math.max(10, look.getX(i) * markerScale() + 4) && d < bestD) {
          bestD = d;
          best = i;
        }
      }
      setHover(best);
    };
    const leave = () => setHover(-1);
    el.addEventListener('pointermove', pick);
    el.addEventListener('pointerdown', pick);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', pick);
      el.removeEventListener('pointerdown', pick);
      el.removeEventListener('pointerleave', leave);
      leave();
    };
  }, [gl, camera, drawn, arcNodes, look, onNodeHover]);

  useFrame(() => {
    const now = packetClock();
    material.uniforms.uTime.value = now;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;
    material.uniforms.uPixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)) / size.height;
    material.uniforms.uScale.value = markerScale();
    let changed = false;
    takeDuePulses(now, (p) => {
      if (p.node < 0 || p.node >= drawn.length) return;
      pulse.setXYZW(p.node, p.at, p.r, p.g, p.b);
      changed = true;
    });
    if (changed) pulse.needsUpdate = true;
  });

  return (
    <group>
      <primitive object={mesh} />
      <NetworkArcs nodes={arcNodes} radius={1} />
    </group>
  );
};

export default NanoRepNodes;
