'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useReps } from '@/lib/reps';
import { latLonToUnit } from '@/lib/geo';
import { ellipsoidRadius, markerScale } from '@/lib/world';
import { packetClock, takeDueRelays } from '@/lib/node-pulse';

// The live Nano nodes that don't vote: about two-thirds of the network. They
// relay blocks and votes and keep their own tally of every election, but hold
// too little delegated weight for their vote to count. Drawn as small, quiet
// dots so the voting nodes (components/nano-rep-nodes) stay the ones that
// stand out. A dot flashes green when that node has heard enough final votes
// to count a block as confirmed (components/network-packets). Places come from each node's network address
// (scripts/build-reps.mjs); a node that couldn't be placed isn't drawn.

const LIFT = 1.0022; // the same height as the voting nodes

const vertex = /* glsl */ `
  uniform float uSize;
  uniform float uTime;
  attribute float aConfirmed; // when this node last confirmed a block, on the packet clock
  varying float vFlash;
  void main() {
    float since = uTime - aConfirmed;
    vFlash = since >= 0.0 ? exp(-since * 2.5) : 0.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (1.0 + 1.2 * vFlash);
  }
`;
const fragment = /* glsl */ `
  varying float vFlash;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    // A small bright core in a soft halo.
    float a = smoothstep(1.0, 0.55, d) * 0.35 + smoothstep(0.5, 0.2, d) * 0.65;
    vec3 color = mix(vec3(0.62, 0.8, 1.0), vec3(0.43, 1.0, 0.66) * 1.6, vFlash);
    gl_FragColor = vec4(color * a, a);
  }
`;

export const RelayNodes: React.FC = () => {
  const file = useReps();

  const points = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uSize: { value: 9 }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(new THREE.BufferGeometry(), material);
    points.frustumCulled = false;
    return points;
  }, []);

  useEffect(() => {
    const nodes = file?.nodes ?? [];
    const position = new Float32Array(nodes.length * 3);
    const at = new THREE.Vector3();
    nodes.forEach((n, i) => latLonToUnit(n.lat, n.lon, at).multiplyScalar(ellipsoidRadius(n.lat) * LIFT).toArray(position, i * 3));
    points.geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    points.geometry.setAttribute('aConfirmed', new THREE.BufferAttribute(new Float32Array(nodes.length).fill(-1e6), 1));
    points.visible = nodes.length > 0;
  }, [file, points]);

  useEffect(
    () => () => {
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    },
    [points]
  );

  useFrame((state) => {
    const u = (points.material as THREE.ShaderMaterial).uniforms;
    u.uSize.value = 9 * state.viewport.dpr * Math.max(0.3, markerScale());
    u.uTime.value = packetClock();
    const confirmed = points.geometry.getAttribute('aConfirmed') as THREE.BufferAttribute | undefined;
    if (!confirmed) return;
    takeDueRelays(u.uTime.value, (node, at) => {
      if (node >= confirmed.count) return;
      confirmed.setX(node, at);
      confirmed.needsUpdate = true;
    });
  });

  return <primitive object={points} />;
};
