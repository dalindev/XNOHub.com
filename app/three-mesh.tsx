'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Rep } from './page';

interface ThreeMeshProps {
  lightRefs: React.RefObject<THREE.DirectionalLight>[];
  data: Rep[] | null;
  manualTime?: Date; // New prop for manually setting the time
}

const ThreeMesh: React.FC<ThreeMeshProps> = ({
  lightRefs,
  data,
  manualTime
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const { scene } = useThree();

  const props = useTexture({
    map: '/earth-assets/earth_no_clouds_8k.jpg',
    bumpMap: '/earth-assets/earth_elev_bump_8k.jpg',
    specularMap: '/earth-assets/earth_water_8k.png',
    emissiveMap: '/earth-assets/earth_night_8k.jpg'
  });

  const shadowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      }),
    []
  );

  const sunMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
      }),
    []
  );

  useEffect(() => {
    if (shadowRef.current) {
      shadowRef.current.renderOrder = 2;
      scene.add(shadowRef.current);
    }
    if (sunRef.current) {
      scene.add(sunRef.current);
    }
    return () => {
      if (shadowRef.current) {
        scene.remove(shadowRef.current);
      }
      if (sunRef.current) {
        scene.remove(sunRef.current);
      }
    };
  }, [scene]);

  const calculateSunPosition = (date: Date): THREE.Vector3 => {
    // Adjust the time by subtracting 5 hours
    const adjustedTime = new Date(date.getTime() - 6 * 60 * 60 * 1000);

    // Convert date to Julian date
    const julianDate = adjustedTime.getTime() / 86400000 + 2440587.5;

    // Calculate the number of centuries since J2000.0
    const T = (julianDate - 2451545.0) / 36525;

    // Calculate the Sun's mean longitude
    let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    L0 = L0 % 360;

    // Calculate the Sun's mean anomaly
    let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    M = M % 360;

    // Convert degrees to radians
    const Mrad = (M * Math.PI) / 180;

    // Calculate the Sun's equation of center
    const C =
      (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
      (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
      0.000289 * Math.sin(3 * Mrad);

    // Calculate the Sun's true longitude
    const trueLongitude = L0 + C;
    const trueLongitudeRad = (trueLongitude * Math.PI) / 180;

    // Calculate the Sun's apparent right ascension
    const rightAscension = Math.atan2(
      Math.cos(0.00569) * Math.sin(trueLongitudeRad),
      Math.cos(trueLongitudeRad)
    );

    // Calculate the Sun's declination
    const sinDec = Math.sin(0.00569) * Math.cos(trueLongitudeRad);
    const declination = Math.asin(sinDec);

    // Calculate the observer's local sidereal time
    const GST = 280.46061837 + 360.98564736629 * (julianDate - 2451545.0);
    const LST = (GST + date.getTimezoneOffset() * 0.25) % 360;
    const LSTrad = (LST * Math.PI) / 180;

    // Calculate the Sun's hour angle
    const hourAngle = LSTrad - rightAscension;

    // Convert to Cartesian coordinates
    const x = Math.cos(hourAngle) * Math.cos(declination);
    const y = Math.sin(hourAngle) * Math.cos(declination);
    const z = Math.sin(declination);

    return new THREE.Vector3(x, z, -y).normalize().multiplyScalar(10);
  };

  useFrame(() => {
    if (earthRef.current && shadowRef.current && sunRef.current) {
      const currentTime = manualTime || new Date();
      const sunPosition = calculateSunPosition(currentTime);

      // Update light position
      lightRefs.forEach((lightRef) => {
        if (lightRef.current) {
          lightRef.current.position.copy(sunPosition);
        }
      });

      // Update Earth rotation
      const rotationSpeed = (2 * Math.PI) / (24 * 60 * 60); // Full rotation in 24 hours
      earthRef.current.rotation.y += rotationSpeed * (1 / 60); // Assuming 60 FPS

      // Update shadow position and rotation
      shadowRef.current.position
        .copy(sunPosition)
        .multiplyScalar(-1)
        .normalize();
      shadowRef.current.lookAt(new THREE.Vector3(0, 0, 0));

      // Update sun visualization position
      sunRef.current.position.copy(sunPosition);
    }
  });

  // const latLongToVector3 = (
  //   lat: number,
  //   lon: number,
  //   radius: number
  // ): THREE.Vector3 => {
  //   const phi = (90 - lat) * (Math.PI / 180);
  //   const theta = (lon + 180) * (Math.PI / 180);
  //   const x = -(radius * Math.sin(phi) * Math.cos(theta));
  //   const y = radius * Math.cos(phi);
  //   const z = radius * Math.sin(phi) * Math.sin(theta);
  //   return new THREE.Vector3(x, y, z);
  // };

  // useEffect(() => {
  //   if (data && earthRef.current) {
  //     // Clear existing meshes
  //     meshesRef.current.forEach((mesh) => {
  //       earthRef.current!.remove(mesh);
  //     });
  //     meshesRef.current = [];

  //     // Create new meshes and labels
  //     data.forEach((node) => {
  //       const position = latLongToVector3(node.latitude, node.longitude, 1);
  //       const geometry = new THREE.CylinderGeometry(0.005, 0.005, 0.05, 32);
  //       const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  //       const mesh = new THREE.Mesh(geometry, material);
  //       mesh.position.set(position.x, position.y, position.z);
  //       mesh.userData = node;

  //       const normal = position.clone().normalize();
  //       const labelPosition = position.clone().add(normal.multiplyScalar(0.1));

  //       const labelCanvas = document.createElement('canvas');
  //       const ctx = labelCanvas.getContext('2d')!;
  //       ctx.font = '24px Arial';
  //       ctx.fillText(node.alias, 10, 50);

  //       const labelTexture = new THREE.CanvasTexture(labelCanvas);
  //       const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture });
  //       const label = new THREE.Sprite(labelMaterial);
  //       label.position.set(labelPosition.x, labelPosition.y, labelPosition.z);
  //       label.scale.set(0.05, 0.05, 0.05);

  //       earthRef.current.add(mesh, label);
  //       meshesRef.current.push(mesh);
  //     });
  //   }
  // }, [data]);

  // const atmosphereShader = {
  //   uniforms: {
  //     c: { type: 'f', value: 1 },
  //     p: { type: 'f', value: 3.0 },
  //     glowColor: { type: 'c', value: new THREE.Color('#000034') },
  //     viewVector: { type: 'v3', value: new THREE.Vector3(0, 0, 1) }
  //   },
  //   vertexShader: `
  //     uniform vec3 viewVector;
  //     uniform float c;
  //     uniform float p;
  //     varying float intensity;
  //     void main() {
  //       vec3 vNormal = normalize(normalMatrix * normal);
  //       vec3 vNormel = normalize(normalMatrix * viewVector);
  //       intensity = pow(c - dot(vNormal, vNormel), p);
  //       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  //     }
  //   `,
  //   fragmentShader: `
  //     uniform vec3 glowColor;
  //     varying float intensity;
  //     void main() {
  //       vec3 glow = glowColor * intensity;
  //       gl_FragColor = vec4(glow, 1.0);
  //     }
  //   `
  // };

  // const atmosphereMaterial = new THREE.ShaderMaterial({
  //   uniforms: atmosphereShader.uniforms,
  //   vertexShader: atmosphereShader.vertexShader,
  //   fragmentShader: atmosphereShader.fragmentShader,
  //   side: THREE.BackSide,
  //   blending: THREE.AdditiveBlending,
  //   transparent: true
  // });

  return (
    <>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          bumpScale={0.005}
          displacementScale={0.02}
          emissive={'lightyellow'}
          emissiveIntensity={0.1}
          {...props}
        />
      </mesh>
      <mesh ref={shadowRef}>
        <sphereGeometry args={[1.02, 32, 32]} />
        <primitive object={shadowMaterial} attach="material" />
      </mesh>
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <primitive object={sunMaterial} attach="material" />
      </mesh>
      {/* <mesh>
        <sphereGeometry args={[1.05, 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh> */}
    </>
  );
};

export default ThreeMesh;
