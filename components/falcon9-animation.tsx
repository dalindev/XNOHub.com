'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { TextureLoader } from 'three';
import * as THREE from 'three';

interface Falcon9 extends THREE.Group {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

export const Falcon9Animation: React.FC = () => {
  const { scene } = useThree();
  const falcon9Ref = useRef<Falcon9>();
  const earthRadius = 1;
  const maxDistance = earthRadius * 50;
  const initialSpeed = 0.01;
  const accelerationRate = 0.02;
  const launchDelay = 10;
  const FLAME_SCALE = 150; // Increased from 150
  const FLAME_SPACING = 20;
  const BODY_ROTATION_SPEED = 0.05;
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

      falcon9Group.position.set(0, earthRadius + 0.21, 0);
      falcon9Group.rotation.z = 0;

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
  }, [obj, scene, texture, flameTexture]);

  useFrame((state, delta) => {
    setElapsedTime((prevTime) => prevTime + delta);

    if (falcon9Ref.current) {
      const rocket = falcon9Ref.current;

      rocket.rotation.y += BODY_ROTATION_SPEED * delta;

      if (phase === 0 && elapsedTime >= launchDelay) {
        setPhase(1);
      }

      if (phase === 1) {
        const distanceFromCenter = rocket.position.length();

        if (distanceFromCenter < maxDistance) {
          const currentSpeed =
            initialSpeed + accelerationRate * (elapsedTime - launchDelay);
          const direction = rocket.position.clone().normalize();
          rocket.position.add(direction.multiplyScalar(currentSpeed * delta));

          const targetRotation = Math.atan2(direction.x, direction.y);
          rocket.rotation.z = THREE.MathUtils.lerp(
            rocket.rotation.z,
            -targetRotation,
            delta * 2
          );
        } else {
          scene.remove(rocket);
          setPhase(2);
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

  return null;
};
