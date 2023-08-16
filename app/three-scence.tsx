'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ThreeMesh from './three-mesh';
import { StarsMesh } from './three-stars-mesh';
import { CloudMesh } from './three-cloud-mesh';
import { useRef } from 'react';

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
      <ambientLight color={0x444444} intensity={1} />
      <directionalLight
        ref={lightRef}
        color={0xffffff}
        position={[5, 3, 5]}
        intensity={1}
      />

      <ThreeMesh lightRef={lightRef} />
      <CloudMesh />
      {/* <StarsMesh /> */}
    </Canvas>
  );
};

export default ThreeScene;
