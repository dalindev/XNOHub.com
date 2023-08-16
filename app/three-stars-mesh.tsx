import React from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { BackSide } from 'three';

export const StarsMesh = () => {
  const starMap = useLoader(TextureLoader, '/earth-assets/starfield.jpg');
  return (
    <mesh>
      <sphereGeometry args={[1000, 32, 32]} />
      <meshPhongMaterial map={starMap} side={BackSide} />
    </mesh>
  );
};
