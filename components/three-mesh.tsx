'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
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

// {
//   "topic": "confirmation",
//   "time": "1721790974578",
//   "message": {
//       "account": "nano_14mytoo837bjozd3wizonc8qu8db533fehbbhnonf5h81a31i4ihojbiy8i1",
//       "amount": "952000000000000000000000000",
//       "hash": "DE103BF03F76B3D954DA07C6DE6EECF1C942C87B4EF2790A16CEFBA16182CDDD",
//       "confirmation_type": "active_quorum",
//       "election_info": {
//           "duration": "458",
//           "time": "1721790974571",
//           "tally": "92724677033683972877068954324283531637",
//           "final": "65863988935346425732083583196945349441",
//           "blocks": "1",
//           "voters": "68",
//           "request_count": "1"
//       },
//       "block": {
//           "type": "state",
//           "account": "nano_14mytoo837bjozd3wizonc8qu8db533fehbbhnonf5h81a31i4ihojbiy8i1",
//           "previous": "1460732E7C8D309BCB0387A17D53D7DC4DA547150E6EB6FD8A179E8CDBD45278",
//           "representative": "nano_3pnanopr3d5g7o45zh3nmdkqpaqxhhp3mw14nzr41smjz8xsrfyhtf9xac77",
//           "balance": "11255150000000000000000000000",
//           "link": "7C74939A2ABF668302B188040E2F6ADF5F21A124E7F00F7760C8EA9AFF2C6CB7",
//           "link_as_account": "nano_1z5nkgf4ohu8ie3d54163rqpoqtz68ikbszi3xup3k9cmdzkru7qtp3xrjkw",
//           "signature": "B73F6F1F6A869BCED7F3DCF654C2631CBC4174E9E26EF1F8A179F9C379AD860E39BE636183778F33D2A3D1B913FB8AF05DD51B5A0E5FA06EA76814B81D6B9E05",
//           "work": "a55deafb51ccc1ac",
//           "subtype": "receive"
//       }
//   }
// }

const ThreeMesh: React.FC<ThreeMeshProps> = ({
  lightRefs,
  repsGeoInfo,
  manualTime,
  onNodeHover,
  onNodeClick
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.Mesh>(null);

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

  return (
    <>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
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
