'use client';

import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import ThreeMesh from './three-mesh';
import { CloudMesh } from './three-cloud-mesh';
import { useRef, useEffect } from 'react';

const ThreeScene = () => {
  const lightRef1 = useRef<THREE.DirectionalLight>(null);
  const lightRef2 = useRef<THREE.DirectionalLight>(null);
  return (
    <Canvas
      camera={{
        fov: 45,
        position: [0, 1, 3]
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
        ref={lightRef1}
        color={0xffffff}
        position={[5, 1, 5]}
        intensity={1.5}
      />
      <directionalLight
        ref={lightRef2}
        color={'0xffffff'}
        position={[-5, 1, 5]}
        intensity={1.5}
      />
      <ThreeMesh lightRefs={[lightRef1, lightRef2]} />
      <CloudMesh />
    </Canvas>
  );
};

export default ThreeScene;
