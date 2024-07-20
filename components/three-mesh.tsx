'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { IRepData } from '@/types/index';
import NanoRepNodes from '@/components/nano-rep-nodes';

interface ThreeMeshProps {
  lightRefs: React.RefObject<THREE.DirectionalLight>[];
  repsGeoInfo: IRepData[] | null;
  manualTime?: Date;
  onNodeHover: (noderepsGeoInfo: IRepData | null) => void;
  onNodeClick: (noderepsGeoInfo: IRepData) => void;
}

const ThreeMesh: React.FC<ThreeMeshProps> = ({
  lightRefs,
  repsGeoInfo,
  manualTime,
  onNodeHover,
  onNodeClick
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  // const { scene } = useThree();

  const [confirmations, setConfirmations] = useState<any[]>([]);

  useEffect(() => {
    const generateConfirmation = () => {
      if (repsGeoInfo && repsGeoInfo.length > 0) {
        const newConfirmation: any = {
          account:
            repsGeoInfo[Math.floor(Math.random() * repsGeoInfo.length)].account,
          duration: 1000 + Math.random() * 2000 // Random duration between 2-5 seconds
        };
        setConfirmations((prev) => [...prev, newConfirmation]);

        // Remove the confirmation after its duration has passed
        setTimeout(() => {
          setConfirmations((prev) => prev.filter((c) => c !== newConfirmation));
        }, newConfirmation.duration);
      }
    };

    // Generate a new confirmation every 1-3 seconds
    const interval = setInterval(
      generateConfirmation,
      1000 + Math.random() * 3000
    );

    return () => clearInterval(interval);
  }, [repsGeoInfo]);

  const props = useTexture({
    map: '/earth-assets/earth_no_clouds_8k.jpg',
    bumpMap: '/earth-assets/earth_elev_bump_8k.jpg',
    specularMap: '/earth-assets/earth_water_8k.png',
    emissiveMap: '/earth-assets/earth_night_8k.jpg'
  });

  const sunMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
      }),
    []
  );

  const calculateSunPosition = (date: Date): THREE.Vector3 => {
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const manualOffset = 12; // 12-hour manual offset

    // Calculate the angle of the sun (in radians)
    const totalSeconds = (hour + manualOffset) * 3600 + minute * 60 + second;
    const angle = ((totalSeconds % 86400) / 86400) * Math.PI * 2; // Ensure 24-hour cycle

    // Calculate the day of the year (0-365)
    const start = new Date(date.getUTCFullYear(), 0, 0);
    const diff =
      date.getTime() -
      start.getTime() +
      (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Calculate solar declination angle
    const declination =
      -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180));
    const declinationRad = declination * (Math.PI / 180);

    // Calculate sun position (reversed rotation)
    const x = Math.cos(angle);
    const y = Math.sin(declinationRad);
    const z = Math.sin(angle);

    return new THREE.Vector3(x, y, z).normalize();
  };

  useEffect(() => {
    const currentTime = manualTime || new Date();
    const sunPosition = calculateSunPosition(currentTime);

    // Update light position
    lightRefs.forEach((lightRef) => {
      if (lightRef.current) {
        const lightPosition = sunPosition.clone().multiplyScalar(50);
        lightRef.current.position.copy(lightPosition);
        lightRef.current.lookAt(new THREE.Vector3(0, 0, 0));
      }
    });

    // Update sun visualization position
    if (sunRef.current) {
      sunRef.current.position.copy(sunPosition.clone().multiplyScalar(10));
    }

    // Update Earth's axial tilt
    if (earthRef.current) {
      const axialTilt = 23.5 * (Math.PI / 180); // 23.5 degrees in radians
      earthRef.current.rotation.x = axialTilt;
    }
  }, [manualTime, lightRefs]);

  // const SampleConfirmationData = [
  //   {
  //     account:
  //       'nano_3ug5bau7xq5cgue9hdr3ppprnxzio1ro7qrothiz34pf7gph3uita8fdb7ar',
  //     startTime: 1721013261260,
  //     duration: 500
  //   },
  //   {
  //     account:
  //       'nano_1banexkcfuieufzxksfrxqf6xy8e57ry1zdtq9yn7jntzhpwu4pg4hajojmq',
  //     startTime: 1721013261260,
  //     duration: 1500
  //   },
  //   {
  //     account:
  //       'nano_3ug8jkpbr35qpa1ceyf6kf7za8nirbxyiyh58iapfzrujfsi4dxf4kmbp6nq',
  //     startTime: 1721013261260,
  //     duration: 3100
  //   },
  //   {
  //     account:
  //       'nano_3eemoaewtwnkkstap3oy487457pb44d3t5ke589rm1fq67k9ebtciw4h9quw',
  //     startTime: 1721013261260,
  //     duration: 2100
  //   },
  //   {
  //     account:
  //       'nano_3ambuw68n7h53wuu7a8e9astuajbgps8amx3db3cbu65rhtjba6t1owgqg5k',
  //     startTime: 1721013261260,
  //     duration: 15000
  //   }
  // ];

  return (
    <>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshPhongMaterial
          bumpScale={0.01}
          displacementScale={0.01}
          emissive={'lightyellow'}
          emissiveIntensity={0.4}
          specular={new THREE.Color(0x333333)}
          shininess={15}
          {...props}
        />
        {repsGeoInfo && (
          <NanoRepNodes
            repsGeoInfo={repsGeoInfo}
            earthRadius={1}
            onNodeHover={onNodeHover}
            onNodeClick={onNodeClick}
            confirmations={confirmations}
          />
        )}
      </mesh>
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <primitive object={sunMaterial} attach="material" />
      </mesh>
    </>
  );
};

export default ThreeMesh;
