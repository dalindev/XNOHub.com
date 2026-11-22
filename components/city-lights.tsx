'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { buildCityLights, decodeCities } from '@/lib/cities';
import { world } from '@/lib/world';

// Night lights as points of light, from a list of 31,810 real cities
// (GeoNames): where each city is and how big it is are real, the individual
// lights are generated. Unlike a night-lights picture, which is a blur once
// you zoom in, these stay sharp at any distance.

const GLOW_DEFINE = '#define GLOW 4.0\n';

const vertex = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uSize;
  uniform float uGain;
  attribute vec4 aLook;
  varying vec4 vLook;
  void main() {
    vec3 p = position;
    vec3 up = normalize(p);
    // Lights come on through dusk and stay off by day.
    float night = 1.0 - smoothstep(-0.13, 0.02, dot(up, uSunDir));
    if (night <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    // Lifted a little off the ground, more from far away: distant terrain is
    // drawn coarsely and would otherwise swallow them. 80 m to 13 km.
    p += up * clamp(distance(cameraPosition, p) * 0.0025, 1.3e-5, 0.002);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * GLOW; // room for the glow round each light
    vLook = vec4(aLook.rgb, aLook.a * night * uGain);
  }
`;

const fragment = /* glsl */ `
  varying vec4 vLook;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    // From orbit a city is not a point: its light scatters off the ground, haze and cloud into a
    // soft glow that runs into its neighbours'. A small core, and a wide faint glow round it that
    // adds up where lights are close together.
    float core = exp(-r * r * 3.0 * GLOW * GLOW) * 0.55;
    float glow = exp(-r * r * 4.5) * (1.0 - r) * 0.14;
    gl_FragColor = vec4(vLook.rgb * (core + glow) * vLook.a, 1.0);
  }
`;

export const CityLights: React.FC = () => {
  const { points, material } = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: GLOW_DEFINE + vertex,
      fragmentShader: GLOW_DEFINE + fragment,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uSize: { value: 2 },
        uGain: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(new THREE.BufferGeometry(), material);
    points.frustumCulled = false;
    points.renderOrder = 0.3; // under the clouds, which dim them
    points.visible = false;
    return { points, material };
  }, []);

  // 0.2 MB, fetched once the page is up; skipped on data-saver connections.
  useEffect(() => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    let live = true;
    fetch('/data/cities.bin')
      .then((r) => {
        if (!r.ok) throw new Error(`cities.bin: HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buffer) => {
        if (!live) return;
        const lights = buildCityLights(decodeCities(buffer));
        const g = points.geometry;
        g.setAttribute('position', new THREE.BufferAttribute(lights.position, 3));
        g.setAttribute('aLook', new THREE.BufferAttribute(lights.look, 4));
        points.visible = true;
      })
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, [points]);

  useEffect(
    () => () => {
      points.geometry.dispose();
      material.dispose();
    },
    [points, material]
  );

  useFrame((state, delta) => {
    const u = material.uniforms;
    u.uSunDir.value.copy(world.sunDirection);
    // From far away a whole city is a pixel or two; close up each light is its own point.
    const near = 1 - THREE.MathUtils.smoothstep(world.altitude, 0.08, 2.2);
    u.uSize.value = THREE.MathUtils.lerp(1.5, 2.6, near) * state.viewport.dpr;
    u.uGain.value = THREE.MathUtils.damp(u.uGain.value, points.visible ? THREE.MathUtils.lerp(0.5, 1, near) : 0, 3, delta);
  });

  return <primitive object={points} />;
};
