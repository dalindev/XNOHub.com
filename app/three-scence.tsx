'use client';

import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import ThreeMesh from './three-mesh';
import { CloudMesh } from './three-cloud-mesh';
import { useRef, useEffect } from 'react';

const ThreeScene = () => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  return (
    <Canvas
      camera={{
        fov: 45,
        position: [0, 1, 2]
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
      <Stars
        radius={200}
        depth={60}
        count={15000}
        factor={10}
        saturation={0}
        fade={true}
      />
      <directionalLight
        ref={lightRef}
        color={0xffffff}
        position={[5, 3, 5]}
        intensity={1}
      />
      <ThreeMesh lightRef={lightRef} />
      <CloudMesh />
    </Canvas>
  );
};

export default ThreeScene;
