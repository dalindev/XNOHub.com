'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ThreeMesh from './three-mesh';

const ThreeScene = () => {
  return (
    <Canvas
      camera={{
        fov: 75,
        position: [0, 0, 2.1]
      }}
      style={{
        cursor: 'move'
      }}
    >
      <OrbitControls enableRotate={true} enableZoom={false} enablePan={false} />
      <ambientLight intensity={1.3} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />
      <ThreeMesh />
    </Canvas>
  );
};

export default ThreeScene;
