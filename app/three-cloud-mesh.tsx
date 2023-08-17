import React, { useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { Mesh } from 'three';

export const CloudMesh = () => {
  const cloudMap = useLoader(TextureLoader, '/earth-assets/fair_clouds_4k.png');
  const meshRef = useRef<Mesh>(null); // Create a reference to the mesh

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.00055;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.01, 64, 64]} />
      <meshPhongMaterial map={cloudMap} transparent={true} opacity={0.5} />
    </mesh>
  );
};
