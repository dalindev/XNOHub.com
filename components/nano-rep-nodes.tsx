'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { world } from '@/lib/world';
import * as THREE from 'three';
import type { RepNode } from '@/types/index';
import NetworkArcs, { type ArcNodes } from '@/components/network-arcs';
import { latLonToUnit } from '@/lib/geo';

// All rep bars are one InstancedMesh (one draw call). Only reps with a known
// location are drawn; arcs use the same set of positions.

interface NanoRepNodesProps {
  reps: RepNode[];
  earthRadius: number;
  onNodeHover: (rep: RepNode | null) => void;
  onPerformanceUpdate?: (cps: number, mode: string, fraction: number) => void;
}

const BASE = new THREE.Color(0x1a6dd4);
const OFFLINE = new THREE.Color(0x3a4a5c);
const HOVER = new THREE.Color(0xffa500);
const UP = new THREE.Vector3(0, 1, 0);

const NanoRepNodes: React.FC<NanoRepNodesProps> = ({
  reps,
  earthRadius,
  onNodeHover,
  onPerformanceUpdate
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hovered = useRef<number | null>(null);

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

  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.0005, 0.006, 1, 8);
    g.translate(0, 0.5, 0); // grows outward from the surface
    return g;
  }, []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.75 }),
    []
  );

  const setBar = (i: number, scale: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const r = drawn[i];
    const dir = new THREE.Vector3().fromArray(arcNodes.directions, i * 3);
    const height = (earthRadius * 0.2 + (r.weightPercent / 50) * earthRadius) * scale;
    const m = new THREE.Matrix4().compose(
      dir.clone().multiplyScalar(earthRadius),
      new THREE.Quaternion().setFromUnitVectors(UP, dir),
      new THREE.Vector3(1, height, 1)
    );
    mesh.setMatrixAt(i, m);
    mesh.instanceMatrix.needsUpdate = true;
  };

  const setColor = (i: number, c: THREE.Color) => {
    meshRef.current?.setColorAt(i, c);
    if (meshRef.current?.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  };

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    drawn.forEach((r, i) => {
      setBar(i, 1);
      setColor(i, r.online ? BASE : OFFLINE);
    });
    mesh.count = drawn.length;
    mesh.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawn, arcNodes, earthRadius]);

  // Bars are hundreds of km tall: right from orbit, absurd from a plane.
  // Hide them below ~300 km; the arcs keep crossing the sky overhead.
  useFrame(() => {
    if (meshRef.current) meshRef.current.visible = world.altitude > 0.05 && world.nearOverride === null;
  });

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const unhover = () => {
    const i = hovered.current;
    if (i === null) return;
    setBar(i, 1);
    setColor(i, drawn[i]?.online ? BASE : OFFLINE);
    hovered.current = null;
    onNodeHover(null);
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const i = e.instanceId;
    if (i === undefined || i === hovered.current) return;
    unhover();
    hovered.current = i;
    setBar(i, 1.3);
    setColor(i, HOVER);
    onNodeHover(drawn[i]);
  };

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, Math.max(1, drawn.length)]}
        onPointerMove={onMove}
        onPointerOut={unhover}
      />
      <NetworkArcs nodes={arcNodes} radius={earthRadius} onPerformanceUpdate={onPerformanceUpdate} />
    </group>
  );
};

export default NanoRepNodes;
