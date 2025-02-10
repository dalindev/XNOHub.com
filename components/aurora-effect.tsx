import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
uniform float time;
varying vec2 vUv;
varying float vElevation;

void main() {
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
    // === BASIC SHAPE PARAMETERS ===
    float radius = 1.02;        // Distance from Earth's center (1.0 is Earth's surface)
    float baseAngle = position.x * 6.28; // Full circle (2 * PI) - controls the spread
    float height = position.y * 0.08;    // Vertical height of the aurora
    
    // === MOVEMENT PARAMETERS ===
    // S-curve movement
    float sCurve = sin(baseAngle * 3.0 + time * 0.8) * 0.15  // Primary wave: frequency(3.0), speed(0.8), amplitude(0.15)
                 + sin(baseAngle * 1.5 - time * 0.5) * 0.1;   // Secondary wave: frequency(1.5), speed(0.5), amplitude(0.1)
    
    // Vertical movement
    float verticalWave = sin(height * 12.0 + time * 0.9) * 0.03   // Up-down wave: frequency(12.0), speed(0.9), amplitude(0.03)
                      + cos(height * 8.0 - time * 1.2) * 0.02;     // Secondary wave: frequency(8.0), speed(1.2), amplitude(0.02)
    
    // === POSITION PARAMETERS ===
    float poleY = 0.99;     // Height at the pole (0.99 is slightly below top)
    float scale = 1.0 - (height * 0.6);  // How much the aurora tapers at the top
    
    // Spiral movement
    float spiral = sin(baseAngle * 4.0 + time * 1.5) * 0.05;  // Spiral: frequency(4.0), speed(1.5), amplitude(0.05)
    float radiusOffset = radius + sCurve + spiral;
    
    // === FINAL POSITION CALCULATION ===
    // Scale factor 0.3 controls the overall size of the ring
    modelPosition.x = radiusOffset * sin(baseAngle) * scale * 0.3;  // X position
    modelPosition.z = radiusOffset * cos(baseAngle) * scale * 0.3;  // Z position
    modelPosition.y = poleY + height + verticalWave;                // Y position
    
    // === WAVE ANIMATION PARAMETERS ===
    // Complex wave movement - controls the flowing effect
    float wave = sin(baseAngle * 5.0 + time * 1.5) * 0.006    // Primary wave
               + sin(height * 8.0 + time * 1.2) * 0.004       // Height-based wave
               + sin(baseAngle * 3.0 + height * 6.0 + time * 2.0) * 0.005;  // Combined wave
               
    // Apply wave movement
    modelPosition.y += wave;
    modelPosition.x += wave * sin(baseAngle) * 0.7;  // Wave influence on X (0.7 = strength)
    modelPosition.z += wave * cos(baseAngle) * 0.7;  // Wave influence on Z (0.7 = strength)
    
    vElevation = wave + sCurve + verticalWave + spiral;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
}
`;

const fragmentShader = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float time;

varying vec2 vUv;
varying float vElevation;

void main() {
    // === COLOR MIXING PARAMETERS ===
    // Base color mixing
    float mixStrength = (sin(vUv.y * 8.0 + time * 0.8) + 1.0) * 0.5;  // Vertical color variation
    mixStrength *= smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);  // Edge fadeout
    mixStrength += sin(vUv.x * 6.0 + time * 1.2) * 0.3;  // Horizontal color variation
    
    // === COLOR BLENDING ===
    vec3 colorMix1 = mix(uColorA, uColorB, mixStrength + vElevation * 20.0);  // Green-Cyan mix (20.0 = intensity)
    vec3 colorMix2 = mix(uColorB, uColorC, sin(time * 0.8 + vUv.x * 4.0) * 0.5 + 0.5);  // Cyan-Blue mix
    vec3 finalColor = mix(colorMix1, colorMix2, sin(time * 0.6 + vUv.y * 3.0) * 0.3 + 0.7);
    
    // === TRANSPARENCY PARAMETERS ===
    float alpha = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);  // Vertical fade
    alpha *= 0.25 * (1.0 + sin(time * 1.2 + vUv.x * 5.0) * 0.4);  // Base transparency (0.25) and variation
    alpha *= smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);  // Horizontal fade
    alpha *= 1.0 + vElevation * 8.0;  // Elevation influence on transparency (8.0 = strength)

    gl_FragColor = vec4(finalColor, alpha);
}
`;

export const AuroraEffect = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  // === COLOR PARAMETERS ===
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      // Adjust colors and brightness multipliers
      uColorA: { value: new THREE.Color('#00ff8e').multiplyScalar(1.4) }, // Pure green
      uColorB: { value: new THREE.Color('#00ffff').multiplyScalar(1.2) }, // Cyan
      uColorC: { value: new THREE.Color('#0088ff').multiplyScalar(1.0) } // Blue
    }),
    []
  );

  // === ANIMATION SPEED ===
  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = state.clock.elapsedTime * 0.4; // Overall animation speed
    }
  });

  return (
    // === POSITION AND ROTATION ===
    // rotation: [X, Y, Z] in radians
    // X: tilt forward/backward (0.3 = tilt forward)
    // Y: rotate around Earth (Math.PI = 180 degrees)
    // For Canada:
    // Math.PI * 1.65 = Eastern Canada
    // Math.PI * 1.75 = Central Canada
    // Math.PI * 1.85 = Western Canada/Alaska
    <group position={[0, 0, 0]} rotation={[0.3, Math.PI * 0.75, 0]}>
      <mesh>
        {/* === GEOMETRY PARAMETERS === */}
        {/* args: [width, height, widthSegments, heightSegments] */}
        {/* width: Math.PI * 2 for full circle */}
        {/* height: vertical size of aurora */}
        {/* segments: higher numbers = smoother curves */}
        <planeGeometry args={[Math.PI * 1, 0.66, 228, 128]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
