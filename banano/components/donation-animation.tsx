'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Banana extends THREE.Group {
  velocity: THREE.Vector3;
}

export const DonationAnimation: React.FC = () => {
  const { scene } = useThree();
  const bananasRef = useRef<Banana[]>([]);
  const earthRadius = 1;

  // Load the meteor texture
  const props = useTexture({
    sun: '/fire_meteor.png'
  });

  // Load the 3D model
  const bananaModel = useGLTF('/banano/donation/banana.glb');

  useFrame(() => {
    bananasRef.current.forEach((banana, index) => {
      banana.position.add(banana.velocity);
      banana.rotateX(0.02); // Add some rotation to the banana
      if (banana.position.length() < earthRadius) {
        scene.remove(banana);
        bananasRef.current.splice(index, 1);
        createExplosion(banana.position);
      }
    });
  });

  const createBanana = (size: number): void => {
    const bananaGroup = new THREE.Group() as any;
    const globalScale = 0.008; // Adjust this value to make all bananas smaller/larger
    const speed = 0.025;

    // Clone the banana model for each instance
    const banana = bananaModel.scene.clone();

    // Scale the banana model with the global scale factor
    banana.scale.setScalar(size * globalScale);
    bananaGroup.add(banana);

    // Position the banana in space
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    bananaGroup.position.set(
      4 * Math.sin(phi) * Math.cos(theta),
      4 * Math.sin(phi) * Math.sin(theta),
      4 * Math.cos(phi)
    );

    // Random initial rotation
    bananaGroup.rotation.x = Math.random() * Math.PI;
    bananaGroup.rotation.y = Math.random() * Math.PI;
    bananaGroup.rotation.z = Math.random() * Math.PI;

    bananaGroup.velocity = new THREE.Vector3()
      .subVectors(new THREE.Vector3(), bananaGroup.position)
      .normalize()
      .multiplyScalar(speed);

    scene.add(bananaGroup);
    bananasRef.current.push(bananaGroup);
  };

  const triggerDonationAnimation = (amount: number): void => {
    const [bananaCount, bananaSize] = getBananaCountAndSize(amount);

    for (let i = 0; i < bananaCount; i++) {
      createBanana(bananaSize);
    }
  };

  useEffect(() => {
    (window as any).triggerDonationAnimation = triggerDonationAnimation;
  }, []);

  useEffect(() => {
    return () => {
      bananaModel.scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => material.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    };
  }, []);

  const createExplosion = (position: THREE.Vector3): void => {
    const explosionGroup = new THREE.Group();
    const surfaceNormal = position.clone().normalize();
    const surfacePosition = surfaceNormal.clone().multiplyScalar(earthRadius);

    // Particle System
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const color = new THREE.Color('#FDB813');
    const baseSize = 0.25;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 0.2 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = baseSize * (1 + Math.random());
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        texture: { value: props.sun }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos += normalize(position) * time * 0.5;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D texture;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor, 1.0) * texture2D(texture, gl_PointCoord);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: false
    });

    const particleSystem = new THREE.Points(geometry, particleMaterial);
    explosionGroup.add(particleSystem);

    // Explosion Ball
    const ballGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const ballMaterial = new THREE.MeshBasicMaterial({
      map: props.sun,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const explosionBall = new THREE.Mesh(ballGeometry, ballMaterial);
    explosionGroup.add(explosionBall);

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color('#FDB813') }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(color, 1.0) * intensity * (1.0 - time * 0.5);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    explosionGroup.add(glow);

    explosionGroup.position.copy(surfacePosition);
    explosionGroup.lookAt(scene.position);
    scene.add(explosionGroup);

    let time = 0;
    const animate = () => {
      time += 0.016; // Assume 60fps
      particleMaterial.uniforms.time.value = time;
      glowMaterial.uniforms.time.value = time;

      const scale = 1 + time * 2;
      explosionGroup.scale.setScalar(scale);

      explosionBall.material.opacity = Math.max(0, 1 - time * 2);
      glow.material.opacity = Math.max(0, 1 - time);

      if (time < 1) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(explosionGroup);
      }
    };

    animate();
  };

  return null;
};

// Adjusted size values for bananas - reduced all sizes by ~70%
const getBananaCountAndSize = (amount: number): [number, number] => {
  if (amount >= 100000) return [30, 0.4];
  if (amount >= 10000) return [20, 0.32];
  if (amount >= 1000) return [10, 0.28];
  if (amount >= 500) return [7, 0.26];
  if (amount >= 100) return [5, 0.24];
  if (amount >= 50) return [3, 0.22];
  if (amount >= 10) return [2, 0.2];
  if (amount >= 5) return [1, 0.18];
  if (amount >= 1) return [1, 0.15];
  return [1, 0.12];
};
