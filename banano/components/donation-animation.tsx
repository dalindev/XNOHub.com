'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface Meteor extends THREE.Mesh {
  velocity: THREE.Vector3;
}

export const DonationAnimation: React.FC = () => {
  const { scene } = useThree();
  const meteorsRef = useRef<Meteor[]>([]);
  const earthRadius = 1;

  // Load the meteor texture
  const props = useTexture({
    moon: '/moon_1k.jpg',
    sun: '/fire_meteor.png'
  });

  useFrame(() => {
    meteorsRef.current.forEach((meteor, index) => {
      meteor.position.add(meteor.velocity);
      if (meteor.position.length() < earthRadius) {
        scene.remove(meteor);
        meteorsRef.current.splice(index, 1);
        createExplosion(meteor.position);
      }
    });
  });

  const createMeteor = (size: number): void => {
    const meteorGeometry = new THREE.SphereGeometry(size, 32, 32);
    const meteorMaterial = new THREE.MeshPhongMaterial({
      map: props.moon,
      color: 0xb8aea3,
      shininess: 25,
      specular: 0x333333,
      transparent: false,
      side: THREE.FrontSide
    });

    const meteor = new THREE.Mesh(meteorGeometry, meteorMaterial) as any;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    meteor.position.set(
      4 * Math.sin(phi) * Math.cos(theta),
      4 * Math.sin(phi) * Math.sin(theta),
      4 * Math.cos(phi)
    );

    meteor.velocity = new THREE.Vector3()
      .subVectors(new THREE.Vector3(), meteor.position)
      .normalize()
      .multiplyScalar(0.04);

    scene.add(meteor);
    meteorsRef.current.push(meteor);
  };

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

  const triggerDonationAnimation = (amount: number): void => {
    const [meteorCount, meteorSize] = getMeteorCountAndSize(amount);

    for (let i = 0; i < meteorCount; i++) {
      createMeteor(meteorSize);
    }
  };

  useEffect(() => {
    (window as any).triggerDonationAnimation = triggerDonationAnimation;
  }, []);

  return null;
};

// Helper function to get meteor count and size based on donation amount
const getMeteorCountAndSize = (amount: number): [number, number] => {
  if (amount >= 100000) return [30, 0.5];
  if (amount >= 10000) return [20, 0.4];
  if (amount >= 1000) return [10, 0.35];
  if (amount >= 500) return [7, 0.35];
  if (amount >= 100) return [5, 0.3];
  if (amount >= 50) return [3, 0.3];
  if (amount >= 10) return [2, 0.25];
  if (amount >= 5) return [1, 0.2];
  if (amount >= 1) return [1, 0.15];
  return [1, 0.1];
};
