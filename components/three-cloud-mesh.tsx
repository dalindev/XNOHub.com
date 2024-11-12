'use client';

import React, { useRef, useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { Mesh, SphereGeometry, MeshPhongMaterial } from 'three';

export const CloudMesh = () => {
  const meshRef = useRef<Mesh>(null);

  // Load texture once and memoize it
  const cloudMap = useLoader(
    TextureLoader,
    '/earth-assets-mini/fair_clouds_4k.png'
  );

  // Memoize geometry and material to prevent recreations
  const geometry = useMemo(() => new SphereGeometry(1.01, 32, 32), []); // Reduced segments from 64 to 32
  const material = useMemo(
    () =>
      new MeshPhongMaterial({
        map: cloudMap,
        transparent: true,
        opacity: 0.5,
        depthWrite: false // Improve transparency rendering
      }),
    [cloudMap]
  );

  // Use a fixed rotation speed value
  const ROTATION_SPEED = 0.00005;

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += ROTATION_SPEED;
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
};
