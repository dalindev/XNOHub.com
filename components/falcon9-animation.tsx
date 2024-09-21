'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
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

interface Falcon9 extends THREE.Group {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

interface Falcon9AnimationProps {
  onComplete: () => void;
  initialPosition?: Vector3; // Add this prop
}

export const Falcon9Animation: React.FC<Falcon9AnimationProps> = ({
  onComplete,
  initialPosition // Add this prop
}) => {
  const { scene } = useThree();
  const falcon9Ref = useRef<Falcon9>();
  const earthRadius = 1;
  const maxDistance = earthRadius * 50;
  const initialSpeed = 0.01;
  const accelerationRate = 0.02;
  const launchDelay = 5;
  const FLAME_SCALE = 150; // Increased from 150
  const FLAME_SPACING = 20;
  const FLAME_COUNT = 3; // Number of flame planes per thruster
  const FLAME_LENGTH_MULTIPLIER = 4; // New constant for flame length

  const [phase, setPhase] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const materials = useLoader(MTLLoader, '/falcon9/SpaceX-Falcon-Heavy.mtl');
  const obj = useLoader(
    OBJLoader,
    '/falcon9/SpaceX-Falcon-Heavy.obj',
    (loader) => {
      materials.preload();
      loader.setMaterials(materials);
    }
  );

  const texture = useLoader(TextureLoader, '/falcon9/falcon_heavy_diff.jpg');
  const flameTexture = useLoader(TextureLoader, '/falcon9/blue-flame.png');

  useEffect(() => {
    if (obj) {
      console.log('Falcon Heavy model loaded', obj);

      const falcon9Group = obj.clone() as Falcon9;
      falcon9Group.scale.set(0.001, 0.001, 0.001);

      falcon9Group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.map = texture;
          child.material.needsUpdate = true;
        }
      });

      const launchPosition =
        initialPosition || getRandomPositionOnGlobe(earthRadius * 1.2);
      falcon9Group.position.copy(launchPosition);

      // Calculate the rotation to face the center of the Earth
      const up = launchPosition.clone().normalize();
      const axis = new THREE.Vector3(0, 1, 0).cross(up).normalize();
      const angle = Math.acos(new THREE.Vector3(0, 1, 0).dot(up));
      falcon9Group.quaternion.setFromAxisAngle(axis, angle);

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

      flameGroups.forEach((group) => falcon9Group.add(group));

      scene.add(falcon9Group);
      falcon9Ref.current = falcon9Group;
    }
  }, [obj, scene, texture, flameTexture, initialPosition]);

  useFrame((state, delta) => {
    setElapsedTime((prevTime) => prevTime + delta);

    if (falcon9Ref.current) {
      const rocket = falcon9Ref.current;

      if (phase === 0 && elapsedTime >= launchDelay) {
        setPhase(1);
      }

      if (phase === 1) {
        const distanceFromCenter = rocket.position.length();

        if (distanceFromCenter < maxDistance) {
          const currentSpeed =
            initialSpeed +
            getRandomizedAcceleration() * (elapsedTime - launchDelay);
          const direction = rocket.position.clone().normalize();
          rocket.position.add(direction.multiplyScalar(currentSpeed * delta));

          // Update the rotation to always face away from the center
          const up = rocket.position.clone().normalize();
          const axis = new THREE.Vector3(0, 1, 0).cross(up).normalize();
          const angle = Math.acos(new THREE.Vector3(0, 1, 0).dot(up));
          rocket.quaternion.setFromAxisAngle(axis, angle);
        } else {
          scene.remove(rocket);
          setPhase(2);
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
    }
  });

  // Add this method to randomize acceleration rate
  const getRandomizedAcceleration = () => {
    const randomFactor = 0.5 + Math.random() * 1; // 0.5 to 1.5
    return accelerationRate * randomFactor;
  };

  return null;
};
