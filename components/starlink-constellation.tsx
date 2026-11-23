'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ORBIT_GLSL, REBASE_S, rebaseRows, siderealAngle, type StarlinkFile, type SatRow } from '@/lib/orbits';
import { simNowMs } from '@/lib/sim-clock';
import { constellation, currentLinks, refreshLinks } from '@/lib/constellation';
import { settings } from '@/lib/settings';
import { world } from '@/lib/world';

// Every Starlink in orbit (~11,000) as one point cloud, plus the approximate
// laser mesh as one line set. The GPU moves them all from orbital elements, so
// time warp is free. Satellites are drawn as small dim dots (they're ~30 m
// across, invisible at true scale from orbit), dimmer still while they are in
// the Earth's shadow; signals get the bright glow.

const VERSION_COLORS = [
  [0.55, 0.62, 0.72], // v1.0
  [0.62, 0.78, 1.0], // v1.5
  [0.92, 0.96, 1.0] // v2 mini
];

const pointVertex = /* glsl */ `
  ${ORBIT_GLSL}
  uniform float uSize;
  uniform vec3 uSunDir;
  uniform float uGain; // 0 against a daytime sky, which drowns them out
  attribute vec4 aOrbit;
  attribute vec2 aRates;
  attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vec3 p = orbitScene(aOrbit, aRates);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize;
    // A satellite in the Earth's shadow reflects no sunlight: draw it dim.
    float along = dot(p, uSunDir);
    float lit = max(step(0.0, along), smoothstep(0.985, 1.01, length(p - along * uSunDir)));
    // And one seen against the sunlit Earth is lost in the glare: find what is
    // behind it (where the line of sight meets the globe) and fade it there.
    vec3 ray = normalize(p - cameraPosition);
    float b = dot(cameraPosition, ray);
    float disc = b * b - dot(cameraPosition, cameraPosition) + 1.0;
    float overDay = 0.0;
    if (disc > 0.0 && b < 0.0) {
      vec3 ground = cameraPosition + ray * (-b - sqrt(disc));
      overDay = smoothstep(-0.05, 0.2, dot(ground, uSunDir));
    }
    vColor = aColor * mix(0.3, 1.0, lit) * mix(1.0, 0.22, overDay);
    // From far away thousands pile up along the limb: draw them fainter.
    vColor *= mix(1.0, 0.6, smoothstep(2.0, 4.5, length(cameraPosition))) * uGain;
  }
`;

const pointFragment = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float a = smoothstep(0.25, 0.0, d);
    gl_FragColor = vec4(vColor * a * 0.5, a * 0.5);
  }
`;

const linkVertex = /* glsl */ `
  ${ORBIT_GLSL}
  attribute vec4 aOrbit;
  attribute vec2 aRates;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(orbitScene(aOrbit, aRates), 1.0);
  }
`;

const linkFragment = /* glsl */ `
  uniform float uOpacity;
  void main() { gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * uOpacity, uOpacity); }
`;

function fillOrbitAttrs(rows: SatRow[], idx: ArrayLike<number>, orbit: Float32Array, rates: Float32Array) {
  for (let k = 0; k < idx.length; k++) {
    const r = rows[idx[k]];
    orbit.set([r[2], r[3], r[4], r[5]], k * 4);
    rates.set([r[6], r[7]], k * 2);
  }
}

export const StarlinkConstellation: React.FC<{ data: StarlinkFile }> = ({ data }) => {
  const { points, lines, pointMat, linkMat, pointIdx } = useMemo(() => {
    // Own copy of the rows: they get re-based in place as sim time moves on.
    const rows = data.sats.map((r) => [...r] as SatRow);
    constellation.rows = rows;
    constellation.epochMs = Date.parse(data.epoch);

    const n = rows.length;
    const pointIdx = Uint32Array.from({ length: n }, (_, i) => i);
    const pg = new THREE.BufferGeometry();
    const orbit = new Float32Array(n * 4), rates = new Float32Array(n * 2), color = new Float32Array(n * 3);
    fillOrbitAttrs(rows, pointIdx, orbit, rates);
    rows.forEach((r, i) => color.set(VERSION_COLORS[r[1]] ?? VERSION_COLORS[2], i * 3));
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    pg.setAttribute('aOrbit', new THREE.BufferAttribute(orbit, 4));
    pg.setAttribute('aRates', new THREE.BufferAttribute(rates, 2));
    pg.setAttribute('aColor', new THREE.BufferAttribute(color, 3));

    // Laser links change as the satellites move (see currentLinks), so the line
    // set is refilled now and then. Each satellite holds at most four links.
    const linkEnds = n * 4 * 2;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linkEnds * 3), 3));
    lg.setAttribute('aOrbit', new THREE.BufferAttribute(new Float32Array(linkEnds * 4), 4).setUsage(THREE.DynamicDrawUsage));
    lg.setAttribute('aRates', new THREE.BufferAttribute(new Float32Array(linkEnds * 2), 2).setUsage(THREE.DynamicDrawUsage));
    lg.setDrawRange(0, 0);

    const shared = { uDt: { value: 0 }, uGst: { value: 0 } };
    const pointMat = new THREE.ShaderMaterial({
      vertexShader: pointVertex,
      fragmentShader: pointFragment,
      uniforms: { ...shared, uSize: { value: 2.5 }, uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uGain: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true
    });
    const linkMat = new THREE.ShaderMaterial({
      vertexShader: linkVertex,
      fragmentShader: linkFragment,
      uniforms: { ...shared, uOpacity: { value: 0.045 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true
    });
    const points = new THREE.Points(pg, pointMat);
    const lines = new THREE.LineSegments(lg, linkMat);
    points.frustumCulled = lines.frustumCulled = false;
    points.renderOrder = lines.renderOrder = 3;
    return { points, lines, pointMat, linkMat, pointIdx };
  }, [data]);

  // What the laser lines were last filled from: the link set and the rows' epoch.
  const linesOf = useRef({ version: -1, epochMs: NaN });

  useEffect(
    () => () => {
      points.geometry.dispose();
      lines.geometry.dispose();
      pointMat.dispose();
      linkMat.dispose();
    },
    [points, lines, pointMat, linkMat]
  );

  useFrame((state) => {
    const refill = (g: THREE.BufferGeometry, idx: ArrayLike<number>) => {
      const o = g.getAttribute('aOrbit') as THREE.BufferAttribute;
      const r = g.getAttribute('aRates') as THREE.BufferAttribute;
      fillOrbitAttrs(constellation.rows, idx, o.array as Float32Array, r.array as Float32Array);
      o.needsUpdate = r.needsUpdate = true;
    };
    const now = simNowMs();
    let dt = (now - constellation.epochMs) / 1000;
    if (Math.abs(dt) > REBASE_S) {
      // Advance every satellite's angles to now and restart dt from 0.
      rebaseRows(constellation.rows, dt);
      constellation.epochMs = now;
      dt = 0;
      refill(points.geometry, pointIdx);
    }
    const gst = siderealAngle(new Date(now));
    constellation.dt = dt;
    constellation.gst = gst;
    pointMat.uniforms.uDt.value = dt;
    pointMat.uniforms.uGst.value = gst;
    pointMat.uniforms.uSunDir.value.copy(world.sunDirection);
    // Dots stay a few pixels wide whatever the distance; a bit bigger on high-DPI.
    pointMat.uniforms.uSize.value = 1.3 * state.viewport.dpr;
    // Nobody sees a satellite against a daytime sky (as with the stars and the
    // meteors), and the Starship view's camera records them like faint stars.
    const daySky = 1 - THREE.MathUtils.smoothstep(world.skyLight, 0.1, 0.35);
    pointMat.uniforms.uGain.value = daySky * (world.look.on ? world.look.starGain : 1);
    refreshLinks(now);
    lines.visible = settings.get().lasers;
    if (lines.visible) {
      const links = currentLinks(now);
      const of = linesOf.current;
      if (of.version !== constellation.linksVersion || of.epochMs !== constellation.epochMs) {
        refill(lines.geometry, links);
        lines.geometry.setDrawRange(0, links.length);
        linesOf.current = { version: constellation.linksVersion, epochMs: constellation.epochMs };
      }
    }
    // Close up (chase views), the links are long streaks across the sky: tone them down.
    linkMat.uniforms.uOpacity.value = 0.045 * (0.35 + 0.65 * THREE.MathUtils.smoothstep(world.altitude, 0.1, 0.6));
  });

  return (
    <>
      <primitive object={points} />
      <primitive object={lines} />
    </>
  );
};
