import React, { useRef, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ThreeMesh = ({
  lightRef
}: {
  lightRef: React.RefObject<THREE.DirectionalLight>;
}) => {
  const props = useTexture({
    map: '/earth-assets/earth_no_clouds_8k.jpg',
    displacementMap: '/earth-assets/earth_elev_bump_8k.jpg',
    specularMap: '/earth-assets/earth_water_8k.png',
    emissiveMap: '/earth-assets/earth_night_8k.jpg'
  });
  const earthRef = useRef<any>(null);
  // const lightRotationSpeed = 0.5;

  const getCurrentTimeInNY = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const nyOffset = -4; // UTC-4 for New York (EST without considering daylight savings)
    return new Date(utc + 3600000 * nyOffset);
  };

  const getSunPosition = (hours: number) => {
    const longitude = -74.006; // New York's longitude
    const latitude = 40.7128; // New York's latitude
    const declinationAngle =
      -23.44 *
      Math.cos(((2 * Math.PI) / 365) * (daysSinceWinterSolstice() + 10)); // Solar declination for given day of the year
    const hourAngle = (12 - hours) * 15; // 15° per hour

    // Calculating sun position
    const altitude = Math.asin(
      Math.sin(latitude) * Math.sin(declinationAngle) +
        Math.cos(latitude) * Math.cos(declinationAngle) * Math.cos(hourAngle)
    );
    const azimuth = Math.atan2(
      -Math.cos(declinationAngle) * Math.sin(hourAngle),
      Math.cos(latitude) * Math.sin(declinationAngle) -
        Math.sin(latitude) * Math.cos(declinationAngle) * Math.cos(hourAngle)
    );

    return { altitude, azimuth };
  };

  const daysSinceWinterSolstice = () => {
    const now = getCurrentTimeInNY();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const solstice = new Date(now.getFullYear(), 11, 21);
    if (now < solstice) solstice.setFullYear(solstice.getFullYear() - 1);
    return (now.valueOf() - solstice.valueOf()) / (24 * 60 * 60 * 1000);
  };

  useFrame(({ clock }) => {
    if (earthRef.current && lightRef.current && lightRef.current.position) {
      const rotationSpeed = (2 * Math.PI) / (24 * 60 * 60 * 60);
      const elapsedTime = clock.getElapsedTime() * rotationSpeed * 2;

      const longitudeOffsetInHours = -5; // Adjust this to shift the sunlight's position
      const offsetInRadians = (longitudeOffsetInHours / 24) * 2 * Math.PI;

      // Adjust the Earth's rotation
      earthRef.current.rotation.y += rotationSpeed;

      // Compute the light's position with the offset
      const radius = 5;
      lightRef.current.position.x =
        radius * Math.cos(elapsedTime + offsetInRadians);
      lightRef.current.position.y = 0.5 + 0.5 * Math.sin(elapsedTime);
      lightRef.current.position.z =
        radius * Math.sin(elapsedTime + offsetInRadians);

      atmosphereMaterial.uniforms.viewVector.value = lightRef.current.position
        .clone()
        .normalize();
    }
  });

  const atmosphereShader = {
    uniforms: {
      c: { type: 'f', value: 1 },
      p: { type: 'f', value: 3.0 },
      glowColor: { type: 'c', value: new THREE.Color('#000034') },
      viewVector: { type: 'v3', value: new THREE.Vector3(0, 0, 1) }
    },
    vertexShader: [
      'uniform vec3 viewVector;',
      'uniform float c;',
      'uniform float p;',
      'varying float intensity;',
      'void main()',
      '{',
      '   vec3 vNormal = normalize( normalMatrix * normal );',
      '	vec3 vNormel = normalize( normalMatrix * viewVector );',
      '	intensity = pow( c - dot(vNormal, vNormel), p );',
      '   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 glowColor;',
      'varying float intensity;',
      'void main()',
      '{',
      '	vec3 glow = glowColor * intensity;',
      '    gl_FragColor = vec4( glow, 1.0 );',
      '}'
    ].join('\n')
  };

  const earthRadius = 1; // this is your earth's radius
  const atmosphereRadius = earthRadius * 1.05; // this will be slightly bigger than the Earth

  const atmosphereMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: atmosphereShader.uniforms,
    vertexShader: atmosphereShader.vertexShader,
    fragmentShader: atmosphereShader.fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.1
  });

  const atmosphereGeometry = new THREE.SphereGeometry(atmosphereRadius, 64, 64);
  const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);

  return (
    <>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          bumpScale={0.005}
          displacementScale={0.02}
          emissive={'yellow'}
          emissiveIntensity={1} // set initial emissiveIntensity to 0
          {...props}
        />
      </mesh>
      <primitive object={atmosphereMesh} />
    </>
  );
};

export default ThreeMesh;
