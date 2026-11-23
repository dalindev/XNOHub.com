'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { seaLevelAltitude, world } from '@/lib/world';
import { moonFix, sunFix } from '@/lib/astro';
import { simNow } from '@/lib/sim-clock';
import { EARTH_RADIUS_KM } from '@/lib/geo';
import { SKY_GLSL, column, newSkyState, radiance, skyAt, transmittance } from '@/lib/sky-model';

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
  uniform float uFade; // 0 inside the air, where the dome draws the sky, 1 above 90 km
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
    float a = glow * lit * 0.75 * uFade;
    gl_FragColor = vec4(color * a, a);
  }
`;

// The daytime sky from inside the air (lib/sky-model): a dome round the
// camera, blue overhead from the ground, navy over a bright band along the
// horizon by 27 km, near-black by 40 km. Drawn after everything opaque and
// only where nothing else is (it tests depth, writes none), so the Earth and
// the vehicles cost it nothing. Like the other sky layers it writes display
// colours, untouched by exposure, so its horizon meets the haze (fog), which
// three also adds after tone mapping.
const domeVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragment = /* glsl */ `
  uniform vec3 uSat;
  uniform float uAltKm;
  uniform float uDither;
  varying vec3 vDir;
  ${SKY_GLSL}
  void main() {
    float mu = dot(normalize(vDir), normalize(cameraPosition));
    gl_FragColor = vec4(uSat * (1.0 - exp(-SKY_K * skyColumn(mu, uAltKm))), 1.0);
    #include <colorspace_fragment>
    // A smooth gradient over a few levels bands on 8-bit screens: dither it
    // (unless the camera look's last pass does, with the same pattern).
    gl_FragColor.rgb += uDither * (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  }
`;
const DOME_RADIUS = 470; // inside the far plane (1000) and the stars (480)

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

export const Sky: React.FC<SkyProps> = ({ lightRef, starsRef }) => {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const skyState = useMemo(() => newSkyState(), []);
  const dome = useRef<THREE.Mesh>(null);
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

  // The Moon seen from inside the air: dimmed and reddened like the Sun, with
  // the sky's own glow in front of it, so by day it is a pale disc on the blue
  // (never fogged into a disc of horizon colour).
  const moonVeil = useMemo(() => ({ uTint: { value: new THREE.Vector3(1, 1, 1) }, uVeil: { value: new THREE.Vector3() } }), []);
  const moonMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 1, metalness: 0, fog: false });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTint = moonVeil.uTint;
      shader.uniforms.uVeil = moonVeil.uVeil;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uTint;\nuniform vec3 uVeil;')
        .replace('#include <opaque_fragment>', 'outgoingLight *= uTint;\n#include <opaque_fragment>')
        .replace('#include <colorspace_fragment>', '#include <colorspace_fragment>\ngl_FragColor.rgb = 1.0 - (1.0 - gl_FragColor.rgb) * (1.0 - uVeil);');
    };
    m.customProgramCacheKey = () => 'moon-veil';
    return m;
  }, [moonTexture, moonVeil]);
  useEffect(() => () => moonMaterial.dispose(), [moonMaterial]);
  const moonScratch = useMemo(() => ({ dir: new THREE.Vector3(), sat: [0, 0, 0], rgb: [0, 0, 0], veil: new THREE.Color() }), []);

  const atmosphere = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: { uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uShape: { value: EARTH_SHAPE }, uHeight: { value: 0.01 }, uFade: { value: 1 } },
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        premultipliedAlpha: true
      }),
    []
  );
  useEffect(() => () => atmosphere.dispose(), [atmosphere]);

  const domeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        name: 'sky-dome',
        vertexShader: domeVertex,
        fragmentShader: domeFragment,
        uniforms: { uSat: { value: new THREE.Vector3() }, uAltKm: { value: 0 }, uDither: { value: 1 } },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
      }),
    []
  );
  useEffect(() => () => domeMaterial.dispose(), [domeMaterial]);

  // Dev: __xno.sky() reads back what the sky is doing.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as { __xno?: Record<string, unknown> };
    w.__xno = {
      ...(w.__xno ?? {}),
      sky: () => ({
        altKm: seaLevelAltitude() * EARTH_RADIUS_KM,
        skyLight: world.skyLight,
        domeVisible: dome.current?.visible ?? false,
        shellFade: atmosphere.uniforms.uFade.value,
        fog: scene.fog instanceof THREE.FogExp2 ? { density: scene.fog.density, color: scene.fog.color.getHexString() } : null,
        look: { ...world.look }
      })
    };
  }, [atmosphere, scene]);

  useFrame((state) => {
    // The sky round the camera at its height: blue by day, warm at dusk,
    // thinning to black with height (lib/sky-model).
    const up = tmp.copy(camera.position).normalize();
    const sunElevation = up.dot(sunDir.current); // sin of the sun's elevation, roughly
    // Above sea level: the model's air thins from sea level, whatever the ground under the camera.
    const altKm = seaLevelAltitude() * EARTH_RADIUS_KM;
    const s = skyAt(altKm, sunElevation, skyState);
    const d = dome.current;
    if (d) {
      d.visible = s.weight * Math.max(s.day, s.dusk) > 0.002;
      d.position.copy(camera.position);
      domeMaterial.uniforms.uSat.value.set(s.sat[0], s.sat[1], s.sat[2]).multiplyScalar(s.weight);
      domeMaterial.uniforms.uAltKm.value = altKm;
      domeMaterial.uniforms.uDither.value = world.look.skyDither;
    }
    // The haze takes the horizon's colour; it thins out between ~13 km and ~130 km up.
    const low = 1 - THREE.MathUtils.smoothstep(world.altitude, 0.002, 0.02);
    fog.color.setRGB(s.horizon[0], s.horizon[1], s.horizon[2]);
    fog.density = 18 * low * low; // per Earth radius: ~50% haze at ~250 km
    scene.fog = low > 0 ? fog : null;
    world.skyLight = s.light;
    if (starsRef?.current) starsRef.current.visible = world.skyLight < 0.35 && world.look.starGain > 0;
    if (moonRef.current && !world.look.on) {
      // To the eye (every view but the Starship one): the Moon as before.
      moonVeil.uTint.value.set(1, 1, 1);
      moonVeil.uVeil.value.set(0, 0, 0);
    } else if (moonRef.current) {
      const ms = moonScratch;
      ms.dir.copy(moonRef.current.position).sub(camera.position);
      const radius = MOON_RADIUS / ms.dir.length();
      const mu = ms.dir.normalize().dot(up);
      // Dimmed and reddened as its top edge is, so it doesn't go dark while part of it still shows.
      const top = mu * Math.cos(radius) + Math.sqrt(Math.max(0, 1 - mu * mu)) * Math.sin(radius);
      transmittance(top, altKm, ms.rgb);
      moonVeil.uTint.value.fromArray(ms.rgb);
      for (let i = 0; i < 3; i++) ms.sat[i] = s.sat[i] * s.weight;
      radiance(ms.sat, column(mu, altKm), ms.rgb);
      ms.veil.setRGB(ms.rgb[0], ms.rgb[1], ms.rgb[2]).convertLinearToSRGB(); // the dome's display colour there
      moonVeil.uVeil.value.set(ms.veil.r, ms.veil.g, ms.veil.b);
    }
    atmosphere.uniforms.uFade.value = THREE.MathUtils.smoothstep(altKm, 60, 90);

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
      {/* After the sky dome (100): far away its depth can round to the cleared value, where the dome would paint over it. */}
      <mesh ref={moonRef} material={moonMaterial} renderOrder={101}>
        <sphereGeometry args={[MOON_RADIUS, 64, 32]} />
      </mesh>
      <mesh ref={shell} material={atmosphere} renderOrder={1}>
        <sphereGeometry args={[1, 96, 48]} />
      </mesh>
      {/* Last among the opaque draws: it fills only what nothing else covered. */}
      <mesh ref={dome} material={domeMaterial} renderOrder={100} scale={DOME_RADIUS} frustumCulled={false} visible={false}>
        <sphereGeometry args={[1, 48, 24]} />
      </mesh>
    </>
  );
};
