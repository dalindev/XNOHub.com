'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { Vector3 } from 'three';

// Add this function at the top of the file, outside the component
function getRandomPositionOnGlobe(radius: number = 1.1): Vector3 {
  const phi = Math.random() * Math.PI * 2;
  const theta = Math.acos(Math.random() * 2 - 1);

  const x = radius * Math.sin(theta) * Math.cos(phi);
  const y = radius * Math.sin(theta) * Math.sin(phi);
  const z = radius * Math.cos(theta);

  return new Vector3(x, y, z);
}

interface FalconHeavy extends THREE.Group {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

interface FalconHeavyAnimationProps {
  onComplete: () => void;
  initialPosition?: Vector3;
  isRocketView: boolean;
  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>;
  setDistanceFromEarth: (distance: number) => void; // Add this prop
}

export const FalconHeavyAnimation: React.FC<FalconHeavyAnimationProps> = ({
  onComplete,
  initialPosition,
  isRocketView,
  cameraRef,
  setDistanceFromEarth // Destructure the prop
}) => {
  const { scene } = useThree();
  const falconheavyRef = useRef<FalconHeavy>(undefined);
  const earthRadius = 1;
  const maxDistance = earthRadius * 1000;
  const initialSpeed = 0.01;
  const accelerationRate = 0.02;
  const launchDelay = 2;
  const FLAME_SCALE = 150;
  const FLAME_SPACING = 20;
  const FLAME_COUNT = 3; // Number of flame planes per thruster
  const FLAME_LENGTH_MULTIPLIER = 4; // New constant for flame length

  // Animation state lives in refs: nothing here should re-render per frame.
  const phaseRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastDistanceReport = useRef(0);

  // 200 KB meshopt GLB (was a 2.6 MB OBJ); see scripts/falcon/obj-to-glb.mjs.
  const gltf = useLoader(GLTFLoader, '/falcon-heavy/falcon-heavy.glb', (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });
  const obj = gltf.scene;

  const texture = useLoader(
    TextureLoader,
    '/falcon-heavy/falcon_heavy_diff.jpg'
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  const flameTexture = useLoader(TextureLoader, '/falcon-heavy/blue-flame.png');

  useEffect(() => {
    if (obj) {
      const falconheavyGroup = obj.clone() as FalconHeavy;
      falconheavyGroup.scale.set(0.001, 0.001, 0.001);

      falconheavyGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.material.map) {
          // Shared by every rocket: the clone reuses the loaded material.
          child.material.map = texture;
          child.material.needsUpdate = true;
        }
      });

      const launchPosition =
        initialPosition || getRandomPositionOnGlobe(earthRadius * 1.2);
      falconheavyGroup.position.copy(launchPosition);

      // Calculate the rotation to face the center of the Earth
      const up = launchPosition.clone().normalize();
      const axis = new THREE.Vector3(0, 1, 0).cross(up).normalize();
      const angle = Math.acos(new THREE.Vector3(0, 1, 0).dot(up));
      falconheavyGroup.quaternion.setFromAxisAngle(axis, angle);

      const createFlameGroup = (x: number) => {
        const flameGroup = new THREE.Group();
        flameGroup.position.set(x, -200, 0);

        for (let i = 0; i < FLAME_COUNT; i++) {
          const flameGeometry = new THREE.PlaneGeometry(1, 1);
          const flameMaterial = new THREE.MeshBasicMaterial({
            map: flameTexture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
          });
          const flame = new THREE.Mesh(flameGeometry, flameMaterial);

          flame.scale.set(
            FLAME_SCALE,
            FLAME_SCALE * FLAME_LENGTH_MULTIPLIER,
            FLAME_SCALE
          );
          flame.rotation.z = Math.PI;
          flame.rotation.y = (i / FLAME_COUNT) * Math.PI * 2;
          flame.geometry.translate(0, 0.5, 0);

          flameGroup.add(flame);
        }

        return flameGroup;
      };

      const flameGroups = [
        createFlameGroup(-FLAME_SPACING),
        createFlameGroup(0),
        createFlameGroup(FLAME_SPACING)
      ];

      flameGroups.forEach((group) => falconheavyGroup.add(group));

      scene.add(falconheavyGroup);
      falconheavyRef.current = falconheavyGroup;
    }
  }, [obj, scene, texture, flameTexture, initialPosition]);

  useEffect(
    () => () => {
      // Unmount: take the rocket out of the scene and free its flame planes.
      const rocket = falconheavyRef.current;
      if (!rocket) return;
      scene.remove(rocket);
      rocket.traverse((o) => {
        if (o instanceof THREE.Mesh && o.geometry instanceof THREE.PlaneGeometry) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    },
    [scene]
  );

  useFrame((state, delta) => {
    elapsedRef.current += delta;
    const elapsedTime = elapsedRef.current;

    if (falconheavyRef.current) {
      const rocket = falconheavyRef.current;

      if (phaseRef.current === 0 && elapsedTime >= launchDelay) {
        phaseRef.current = 1;
      }

      if (phaseRef.current === 1) {
        const distanceFromCenter = rocket.position.length();

        if (distanceFromCenter < maxDistance) {
          let currentSpeed;
          if (distanceFromCenter <= 35) {
            // Stage 1
            currentSpeed =
              initialSpeed +
              getRandomizedAcceleration() * (elapsedTime - launchDelay) * 1.5;
          } else if (distanceFromCenter > 35 && distanceFromCenter <= 75) {
            // Stage 2
            currentSpeed =
              initialSpeed +
              getRandomizedAcceleration() *
                Math.pow(elapsedTime - launchDelay, 1.5); // Use power of two for distance > 200
          } else {
            // Stage 3
            currentSpeed =
              initialSpeed +
              getRandomizedAcceleration() *
                Math.pow(elapsedTime - launchDelay, 2); // Use power of two for distance > 200
          }

          const direction = rocket.position.clone().normalize();
          rocket.position.add(direction.multiplyScalar(currentSpeed * delta));

          // Update the rotation to always face away from the center
          const up = rocket.position.clone().normalize();
          const axis = new THREE.Vector3(0, 1, 0).cross(up).normalize();
          const angle = Math.acos(new THREE.Vector3(0, 1, 0).dot(up));
          rocket.quaternion.setFromAxisAngle(axis, angle);
        } else {
          scene.remove(rocket);
          phaseRef.current = 2;
          onComplete(); // Call onComplete when the animation is finished
        }
      }

      // Animate flame groups
      rocket.children.forEach((child) => {
        if (child instanceof THREE.Group) {
          child.children.forEach((flame, index) => {
            if (flame instanceof THREE.Mesh) {
              // Rotate each flame plane
              // flame.rotation.y += delta * 2;

              // Pulsate flame height with increased length
              flame.scale.y =
                FLAME_SCALE *
                FLAME_LENGTH_MULTIPLIER *
                (1 + Math.sin(elapsedTime * 10 + index) * 0.1);

              // Pulsate opacity
              flame.material.opacity =
                0.7 + Math.sin(elapsedTime * 15 + index) * 0.3;
            }
          });
        }
      });

      if (isRocketView && cameraRef.current) {
        // Calculate the position slightly behind and above the rocket
        const offset = new THREE.Vector3(0, 0.05, -0.1);
        offset.applyQuaternion(rocket.quaternion);
        const cameraPosition = rocket.position.clone().add(offset);

        // Set the camera position and look at the center of the Earth
        cameraRef.current.position.copy(cameraPosition);
        cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0));
        cameraRef.current.updateProjectionMatrix();
      }

      // Distance readout for the active rocket, ~10 times a second.
      if (isRocketView && elapsedTime - lastDistanceReport.current > 0.1) {
        lastDistanceReport.current = elapsedTime;
        setDistanceFromEarth(rocket.position.length());
      }
    }
  });

  // Add this method to randomize acceleration rate
  const getRandomizedAcceleration = () => {
    const randomFactor = 0.5 + Math.random() * 1; // 0.5 to 1.5
    return accelerationRate * randomFactor;
  };

  return null; // Remove the overlay rendering from here
};
