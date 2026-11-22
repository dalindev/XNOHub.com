'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { world } from '@/lib/world';
import { moonFix, sunFix } from '@/lib/astro';
import { simNow } from '@/lib/sim-clock';

// Sun light, Moon and atmosphere, all driven by the sim clock. Positions are
// real: the Moon sits at its true distance (~60 Earth radii) and size.

const MOON_RADIUS = 1737.4 / 6371; // Earth radii
const SUN_LIGHT_DISTANCE = 50; // the light only needs a direction
const UPDATE_EVERY = 1 / 30; // s of real time between ephemeris updates (smooth under time warp)

// The air seen from outside: a thin line of light along the horizon, brightest
// at the edge of the Earth and fading smoothly into space, with a little haze
// just inside the edge. Worked out per pixel from how close the line of sight
// passes to the Earth, so it has no outline of its own from any height.
// Blue on the day side, warm at the terminator, gone at night.
const atmosphereVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uShape; // the Earth's radii (equatorial, polar, equatorial)
  uniform float uHeight; // how far the glow reaches, in Earth radii (its e-folding height)
  varying vec3 vWorld;
  void main() {
    // In a frame where the Earth is a unit ball.
    vec3 o = cameraPosition / uShape;
    vec3 dir = normalize(vWorld / uShape - o);
    vec3 nearest = o - dir * dot(o, dir); // where the line of sight passes closest to the centre
    float d = length(nearest);
    float glow = d > 1.0 ? exp(-(d - 1.0) / uHeight) : exp(-(1.0 - d) / (uHeight * 1.6));
    float day = dot(nearest / max(d, 1e-4), uSunDir);
    float lit = smoothstep(-0.25, 0.35, day);
    vec3 dayColor = vec3(0.36, 0.6, 1.0);
    vec3 duskColor = vec3(1.0, 0.45, 0.2);
    vec3 color = mix(duskColor, dayColor, smoothstep(-0.05, 0.4, day));
    float a = glow * lit * 0.75;
    gl_FragColor = vec4(color * a, a);
  }
`;

// The glow's reach follows the camera's height, so it stays a few pixels wide
// from far away (the real 8 km would be invisible) and thin from low orbit; and
// its shell is always below the camera.
const glowHeight = (altitude: number) => THREE.MathUtils.clamp(altitude / 12, 0.0015, 0.012);
const SHELL_HEIGHTS = 6; // the shell sits this many glow heights up, where the glow is 0.2% of its peak
const EARTH_SHAPE = new THREE.Vector3(6378.137 / 6371, 6356.752 / 6371, 6378.137 / 6371);

interface SkyProps {
  lightRef: React.RefObject<THREE.DirectionalLight | null>;
  /** Hidden when the low-altitude daylight sky is bright enough. */
  starsRef?: React.RefObject<THREE.Object3D | null>;
}

const DAY_SKY = new THREE.Color(0.32, 0.56, 0.95);
const DUSK_SKY = new THREE.Color(0.55, 0.32, 0.22);
const SPACE = new THREE.Color(0, 0, 0);

export const Sky: React.FC<SkyProps> = ({ lightRef, starsRef }) => {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const background = useMemo(() => new THREE.Color(0, 0, 0), []);
  // Aerial perspective near the ground: distant ridges fade into the sky.
  const fog = useMemo(() => new THREE.FogExp2(0x000000, 0), []);
  const sunDir = useRef(new THREE.Vector3(1, 0, 0));
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const moonRef = useRef<THREE.Mesh>(null);
  const moonTexture = useLoader(THREE.TextureLoader, '/moon_1k.jpg');
  const last = useRef(-Infinity);
  const shell = useRef<THREE.Mesh>(null);

  useEffect(() => {
    moonTexture.colorSpace = THREE.SRGBColorSpace;
  }, [moonTexture]);

  const atmosphere = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: { uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uShape: { value: EARTH_SHAPE }, uHeight: { value: 0.01 } },
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        premultipliedAlpha: true
      }),
    []
  );
  useEffect(() => () => atmosphere.dispose(), [atmosphere]);

  useFrame((state) => {
    // Sky colour seen from low altitude: blue by day, warm at dusk, black in
    // space. Fades out between ~13 km and ~130 km up.
    const up = tmp.copy(camera.position).normalize();
    const sunElevation = up.dot(sunDir.current); // sin of the sun's elevation, roughly
    const low = 1 - THREE.MathUtils.smoothstep(world.altitude, 0.002, 0.02);
    const day = THREE.MathUtils.smoothstep(sunElevation, -0.1, 0.25);
    const dusk = Math.max(0, 1 - Math.abs(sunElevation - 0.0) / 0.15) * 0.6;
    background.copy(SPACE).lerp(DUSK_SKY, dusk * low).lerp(DAY_SKY, day * low);
    scene.background = low > 0 ? background : null;
    fog.color.copy(background);
    fog.density = 18 * low * low; // per Earth radius: ~50% haze at ~250 km
    scene.fog = low > 0 ? fog : null;
    world.skyLight = day * low;
    if (starsRef?.current) starsRef.current.visible = day * low < 0.35;

    const h = glowHeight(world.altitude);
    atmosphere.uniforms.uHeight.value = h;
    shell.current?.scale.copy(EARTH_SHAPE).multiplyScalar(1 + SHELL_HEIGHTS * h);

    const t = state.clock.elapsedTime;
    if (t - last.current < UPDATE_EVERY) return;
    last.current = t;
    const now = simNow();
    const sun = sunFix(now);
    lightRef.current?.position.copy(sun.direction).multiplyScalar(SUN_LIGHT_DISTANCE);
    atmosphere.uniforms.uSunDir.value.copy(sun.direction);
    sunDir.current.copy(sun.direction);
    world.sunDirection.copy(sun.direction);

    const moon = moonRef.current;
    if (moon) {
      const m = moonFix(now);
      moon.position.copy(m.direction).multiplyScalar(m.distance);
      // Tidally locked: the near side (texture centre, local +X) faces Earth.
      moon.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), m.direction.clone().negate());
    }
  });

  return (
    <>
      <mesh ref={moonRef}>
        <sphereGeometry args={[MOON_RADIUS, 64, 32]} />
        <meshStandardMaterial map={moonTexture} roughness={1} metalness={0} />
      </mesh>
      <mesh ref={shell} material={atmosphere} renderOrder={1}>
        <sphereGeometry args={[1, 96, 48]} />
      </mesh>
    </>
  );
};
