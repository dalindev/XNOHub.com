'use client';

import React, { useRef } from 'react';
import { useEarthTextures } from '@/lib/earth-textures';
import * as THREE from 'three';
import type { RepNode } from '@/types/index';
import NanoRepNodes from '@/components/nano-rep-nodes';

// City lights only on the night side: fade the emissive map out across the
// terminator using the sun light's direction (light 0, view space).
const nightLightsOnlyAtNight = (shader: THREE.WebGLProgramParametersWithUniforms) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
    #if NUM_DIR_LIGHTS > 0
      totalEmissiveRadiance *= smoothstep(0.12, -0.18, dot(normal, directionalLights[0].direction));
    #endif`
  );
};

interface ThreeMeshProps {
  reps: RepNode[] | null;
  /** Receives the globe surface mesh (hidden while tiles are drawn). */
  surfaceRef?: React.RefObject<THREE.Mesh | null>;
  onNodeHover: (rep: RepNode | null) => void;
  onPerformanceUpdate?: (cps: number, mode: string, fraction: number) => void;
}

const ThreeMesh: React.FC<ThreeMeshProps> = ({
  reps,
  surfaceRef,
  onNodeHover,
  onPerformanceUpdate
}) => {
  const ownRef = useRef<THREE.Mesh>(null);
  const earthRef = surfaceRef ?? ownRef;

  const props = useEarthTextures();

  return (
    <>
      <mesh ref={earthRef}>
        {/* Earth-fixed frame: no tilt here, the Sun's position carries the season. */}
        <sphereGeometry args={[1, 128, 64]} />
        <meshPhongMaterial
          bumpScale={0.01}
          displacementScale={0.01}
          emissive={'lightyellow'}
          emissiveIntensity={0.9}
          onBeforeCompile={nightLightsOnlyAtNight}
          specular={new THREE.Color(0x333333)}
          shininess={15}
          {...props}
        />
        {reps && (
          <NanoRepNodes
            reps={reps}
            earthRadius={1}
            onNodeHover={onNodeHover}
            onPerformanceUpdate={onPerformanceUpdate}
          />
        )}
      </mesh>
    </>
  );
};

export default ThreeMesh;
