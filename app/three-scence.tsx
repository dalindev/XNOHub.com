'use client';

import React from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ThreeMesh from './three-mesh';
import { StarsMesh } from './three-stars-mesh';

const ThreeScene = () => {
  return (
    <Canvas
      camera={{
        fov: 75,
        position: [0, 0.5, 0.75]
      }}
      style={{
        cursor: 'move'
      }}
    >
      <OrbitControls
        enableRotate={true}
        rotateSpeed={0.5}
        enableZoom={true}
        zoomSpeed={0.2}
        enablePan={false}
        // autoRotate={true}
        // autoRotateSpeed={0.25}
      />
      <ambientLight color={0x333333} intensity={1} />
      <directionalLight color={0xffffff} position={[5, 3, 5]} intensity={1.4} />
      <ThreeMesh />
      <StarsMesh />
    </Canvas>
  );
};

export default ThreeScene;
