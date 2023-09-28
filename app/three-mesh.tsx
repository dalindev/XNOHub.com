import React, { useRef, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Rep } from './page';

interface ThreeMeshProps {
  lightRefs: React.RefObject<THREE.DirectionalLight>[];
  data: Rep[] | null;
}

const sunPositionOffset = {
  x: -9, // Offset for the x-axis
  y: 0, // Offset for the y-axis
  z: 0 // Offset for the z-axis
};

const ThreeMesh: React.FC<ThreeMeshProps> = ({ lightRefs, data }) => {
  const lastUpdateTimeRef = useRef(0);
  const props = useTexture({
    map: '/earth-assets/earth_no_clouds_8k.jpg',
    displacementMap: '/earth-assets/earth_elev_bump_8k.jpg',
    specularMap: '/earth-assets/earth_water_8k.png',
    emissiveMap: '/earth-assets/earth_night_8k.jpg'
  });
  const earthRef = useRef<any>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);

  const getCurrentTimeInNY = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const nyOffset = 0; // UTC-4 for New York (EST without considering daylight savings)
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

  useFrame(({ clock, camera }) => {
    const elapsedTime = clock.getElapsedTime();

    if (earthRef.current && elapsedTime - lastUpdateTimeRef.current >= 1) {
      lastUpdateTimeRef.current = elapsedTime;

      const rotationSpeed = (2 * Math.PI) / (24 * 60 * 60 * 60);
      earthRef.current.rotation.y = rotationSpeed * clock.elapsedTime;

      // Get the current hour in New York
      const currentTime = getCurrentTimeInNY();
      const currentHour = currentTime.getHours();

      // Calculate the sun's position
      const sunPosition = getSunPosition(currentHour);
      const radius = 10; // Distance of the light source from the Earth

      lightRefs.forEach((lightRef, index) => {
        if (lightRef.current && lightRef.current.position) {
          // Set the light's position based on the sun's altitude and azimuth
          const offset = (index * Math.PI) / 2;
          lightRef.current.position.x =
            radius *
            Math.cos(sunPosition.azimuth + offset + sunPositionOffset.x);
          lightRef.current.position.y = radius * Math.sin(sunPosition.altitude);
          lightRef.current.position.z = radius * Math.sin(sunPosition.azimuth);
        }
      });

      // Adjust the Earth's rotation
      earthRef.current.rotation.y += rotationSpeed;
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

  const latLongToVector3 = (
    lat: number,
    lon: number,
    radius: number
  ): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  };

  useEffect(() => {
    if (data && earthRef.current) {
      // Clear existing meshes
      meshesRef.current.forEach((mesh) => {
        earthRef.current.remove(mesh);
      });
      meshesRef.current = [];

      // Create new meshes and labels
      data.forEach((node) => {
        const position = latLongToVector3(node.latitude, node.longitude, 1);
        const geometry = new THREE.CylinderGeometry(0.005, 0.005, 0.05, 32); // Cylinder geometry
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        mesh.userData = node; // Attach node data to mesh

        // Calculate the normal vector at this position
        const normal = position.clone().normalize();

        // Scale the normal vector and add it to the original position
        const labelPosition = position.clone().add(normal.multiplyScalar(0.1));

        // Create label
        const labelCanvas = document.createElement('canvas');
        const ctx = labelCanvas.getContext('2d');
        ctx!.font = '24px Arial';
        ctx!.fillText(node.alias, 10, 50);

        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture });
        const label = new THREE.Sprite(labelMaterial);
        label.position.set(labelPosition.x, labelPosition.y, labelPosition.z);
        label.scale.set(0.05, 0.05, 0.05);

        earthRef.current.add(mesh, label);
        meshesRef.current.push(mesh);
      });
    }
  }, [data]);

  return (
    <>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          bumpScale={0.005}
          displacementScale={0.02}
          emissive={'lightyellow'}
          emissiveIntensity={1} // set initial emissiveIntensity to 0
          {...props}
        />
      </mesh>
      <primitive object={atmosphereMesh} />
      {/* <primitive object={cityMesh} /> Add this line */}
    </>
  );
};

export default ThreeMesh;
