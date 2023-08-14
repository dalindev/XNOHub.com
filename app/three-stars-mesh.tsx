import React from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { BackSide } from 'three';

export const StarsMesh = () => {
  const starMap = useLoader(TextureLoader, '/earth-assets/starmap_g4k.jpg');
  return (
    <mesh>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial map={starMap} side={BackSide} opacity={0.3} />
    </mesh>
  );
};
