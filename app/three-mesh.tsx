import React, { useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ThreeMesh = ({ lightRef }: { lightRef: any }) => {
  const props = useTexture({
    map: '/earth-assets/earth_no_clouds_8k.jpg',
    displacementMap: '/earth-assets/earth_elev_bump_8k.jpg',
    specularMap: '/earth-assets/earth_water_8k.png',
    emissiveMap: '/earth-assets/earth_night_8k.jpg'
  });

  const earthRef = useRef<any>(null);
  const lightRotationSpeed = 0.5;

  useFrame(({ clock }) => {
    if (earthRef.current && lightRef.current) {
      const elapsedTime = clock.getElapsedTime() * lightRotationSpeed;
      const radius = 5;
      lightRef.current.position.x = radius * Math.cos(elapsedTime);
      lightRef.current.position.y = 1.5 + 1.5 * Math.sin(elapsedTime);
      lightRef.current.position.z = radius * Math.sin(elapsedTime);
      earthRef.current.rotation.y += 0.0005;

      // Calculate the position on the Earth's surface that is currently facing the light
      const oppositeLightDirection = new THREE.Vector3(
        -lightRef.current.position.x,
        -lightRef.current.position.y,
        -lightRef.current.position.z
      ).normalize();

      // The dot product of the light direction with the Earth's "front" gives an idea of how much of the Earth's front is illuminated
      const dot = oppositeLightDirection.dot(new THREE.Vector3(0.5, 3, 1));

      // This will make the night map show when there's no light, and the day map show when it's fully illuminated
      const emissiveIntensity = 1 - dot;
      earthRef.current.material.emissiveIntensity = THREE.MathUtils.clamp(
        emissiveIntensity,
        0,
        1
      );
    }
  });

  return (
    <mesh ref={earthRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        bumpScale={0.005}
        displacementScale={0.02}
        emissive={'white'}
        emissiveIntensity={0} // set initial emissiveIntensity to 0
        {...props}
      />
    </mesh>
  );
};

export default ThreeMesh;
