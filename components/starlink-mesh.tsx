'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { Vector3 } from 'three';

interface StarlinkMeshProps {
  count?: number;
  isStarlinkView?: boolean;
  activeStarlinkIndex?: number | null;
  cameraRef?: React.RefObject<THREE.PerspectiveCamera>;
}

interface OrbitData {
  radius: number;
  inclination: number;
  angle: number;
  speed: number;
  container: THREE.Group;
  lastUpdateTime: number;
}

export const StarlinkMesh: React.FC<StarlinkMeshProps> = ({
  count = 6,
  isStarlinkView = false,
  activeStarlinkIndex = null,
  cameraRef
}) => {
  const satellites = useRef<THREE.Group[]>([]);
  const model = useLoader(
    GLTFLoader,
    '/starlink/starlink_spacex_satellite.glb'
  );
  const orbitDataRef = useRef<OrbitData[]>([]);
  const lastFrameTime = useRef(Date.now());
  const accumulatedTime = useRef(0);
  const FIXED_TIME_STEP = 1 / 60; // 60 FPS fixed time step

  useEffect(() => {
    if (satellites.current.length > 0) return; // Only initialize once

    const actualCount = Math.min(count, 21);
    const currentTime = Date.now();

    satellites.current = Array(actualCount)
      .fill(null)
      .map((_, index) => {
        const group = new THREE.Group();
        const orbitNumber = Math.floor(index / 3);
        const satelliteInOrbit = index % 3;
        const orbitRadius = 1.5 + Math.random() * 1.33;
        const orbitInclination = Math.PI / 4 + (orbitNumber * Math.PI) / 2;
        const startAngle = satelliteInOrbit * ((Math.PI * 2) / 3);

        const orbitContainer = new THREE.Group();
        const position = new Vector3(
          orbitRadius * Math.cos(startAngle),
          orbitRadius * Math.sin(startAngle) * Math.sin(orbitInclination),
          orbitRadius * Math.sin(startAngle) * Math.cos(orbitInclination)
        );

        orbitContainer.position.copy(position);

        const satellite = model.scene.clone();
        satellite.scale.set(0.02, 0.02, 0.02);

        const light = new THREE.PointLight(Math.random() * 0xffffff, 0.6, 0.2);
        satellite.add(light);

        satellite.rotation.set(Math.PI / 2, 0, 0);
        orbitContainer.add(satellite);
        group.add(orbitContainer);

        // Generate a random base speed between 0.05 and 0.15
        const baseSpeed = 0.03 + Math.random() * 0.12;

        orbitDataRef.current[index] = {
          radius: orbitRadius,
          inclination: orbitInclination,
          angle: startAngle,
          speed: baseSpeed, // Use random speed instead of orbit-based speed
          container: orbitContainer,
          lastUpdateTime: currentTime
        };

        return group;
      });
  }, [model]);

  useFrame(() => {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime.current) / 1000;
    lastFrameTime.current = currentTime;

    // Accumulate time
    accumulatedTime.current += deltaTime;

    // Update in fixed time steps
    while (accumulatedTime.current >= FIXED_TIME_STEP) {
      orbitDataRef.current.forEach((orbitData, index) => {
        if (!orbitData) return;

        // Update angle with fixed time step
        orbitData.angle += FIXED_TIME_STEP * orbitData.speed;

        const position = new Vector3(
          orbitData.radius * Math.cos(orbitData.angle),
          orbitData.radius *
            Math.sin(orbitData.angle) *
            Math.sin(orbitData.inclination),
          orbitData.radius *
            Math.sin(orbitData.angle) *
            Math.cos(orbitData.inclination)
        );

        // Smooth position update using lerp
        orbitData.container.position.lerp(position, 0.1);

        const directionFromEarth = position.clone().normalize();
        const outwardPosition = position.clone().add(directionFromEarth);

        // Smooth rotation update
        const currentRotation = orbitData.container.quaternion.clone();
        orbitData.container.lookAt(outwardPosition);
        const targetRotation = orbitData.container.quaternion.clone();
        orbitData.container.quaternion.copy(currentRotation);
        orbitData.container.quaternion.slerp(targetRotation, 0.1);

        // Camera follow logic with smoother transitions
        if (
          isStarlinkView &&
          activeStarlinkIndex === index &&
          cameraRef?.current
        ) {
          const directionToEarth = position.clone().normalize();
          const cameraOffset = directionToEarth.multiplyScalar(0.5);
          cameraOffset.y += 0.1;

          const cameraPosition = position.clone().add(cameraOffset);
          cameraRef.current.position.lerp(cameraPosition, 0.05); // Slower lerp for camera
          cameraRef.current.lookAt(new Vector3(0, 0, 0));
          cameraRef.current.up.set(0, 1, 0);
        }
      });

      accumulatedTime.current -= FIXED_TIME_STEP;
    }
  });

  return (
    <group>
      {satellites.current.map((satellite, index) => (
        <primitive key={index} object={satellite} />
      ))}
    </group>
  );
};
