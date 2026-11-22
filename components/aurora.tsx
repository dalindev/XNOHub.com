'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { spaceWeather, auroraDrive, AURORA_W, AURORA_H } from '@/lib/space-weather';
import { settings } from '@/lib/settings';
import { world } from '@/lib/world';
import { KM } from '@/lib/geo';

// The aurora, where NOAA's OVATION model says it is right now. Brightness
// follows the forecast chance of visible aurora; the ovals sit over the real
// geomagnetic poles and only show on the night side.
//
// It is drawn as a stack of thin shells from 100 to 270 km up, so from orbit
// it reads as glowing arcs and from the side as curtains. Where the oval is
// and how bright it is are real, and change with each new forecast (every few
// minutes at NOAA, fetched every 15 here). The arcs and rays inside the oval
// are procedural, and they are what moves: the model gives the oval, not the
// individual curtains.
//
// How it moves and what colour it is follow the real space weather too
// (lib/space-weather, auroraDrive):
//  - Everything moves faster the faster the solar wind is blowing.
//  - Like real aurora it is not in one mood all over. Calm stretches drift
//    slowly; lively stretches, which travel west along the oval, are brighter
//    and fold and flicker several times faster. The more disturbed the
//    magnetic field, the more of the oval is lively.
//  - Colour goes by height: oxygen green from 100 to about 200 km, oxygen red
//    above that where the rays stand tall, a pink lower border (nitrogen)
//    under lively aurora, and violet-blue on tops that reach up into sunlight
//    near the day-night line.

const SHELLS_KM = [100, 115, 135, 165, 210, 270];
const CARRIER = 2; // the 135 km shell: seen from above, it alone is drawn, with the light of all six
const CAP_DEG = 58; // each polar cap reaches this far from its pole

// "noise": smooth random values, 0 to 1, that vary over a distance of 1.
//
// Per pixel they are read from a small block of random numbers (noiseBlock
// below) with one texture lookup. Working them out instead costs about 100
// operations a time, several times per pixel: with the aurora filling a
// high-density screen, one frame in seven ran late.
const NOISE_SIZE = 64;
const PIXEL_NOISE = /* glsl */ `
  uniform highp sampler3D uNoise;
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return textureLod(uNoise, (i + f + 0.5) / ${NOISE_SIZE}.0, 0.0).r;
  }
`;
// Per vertex they are worked out. (There are few vertices, and texture
// lookups in a vertex shader turned out far slower than the arithmetic:
// half the frames late on an Apple M4.)
const VERTEX_NOISE = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
                   mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                   mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`;

/** The block of random numbers behind the per-pixel noise: 64 on a side, repeating in every direction, the same for everyone. */
function noiseBlock() {
  const data = new Uint8Array(NOISE_SIZE ** 3);
  let a = 0x2f6e2b1;
  for (let i = 0; i < data.length; i++) {
    // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    data[i] = ((t ^ (t >>> 14)) >>> 0) >>> 24;
  }
  const block = new THREE.Data3DTexture(data, NOISE_SIZE, NOISE_SIZE, NOISE_SIZE);
  block.format = THREE.RedFormat;
  block.type = THREE.UnsignedByteType;
  block.minFilter = block.magFilter = THREE.LinearFilter;
  block.wrapS = block.wrapT = block.wrapR = THREE.RepeatWrapping;
  block.unpackAlignment = 1;
  block.needsUpdate = true;
  return block;
}

// The animation clock starts over after this long, at a moment when every
// pattern is back where it began, so the numbers the shader works with stay small.
const CLOCK_WRAP = 64_000;

// The broad, slow patterns (several hundred km across and up) are worked out
// once per vertex, every 2 degrees, and only the fine structure per pixel.
const vertex = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  attribute float aShell;
  varying vec3 vDir;
  varying float vShell;
  varying vec2 vMapUv; // this spot on NOAA's map
  varying vec4 vBroad; // how tall the rays stand, the oval's slow breathing, where it is lively, where the arcs show
  varying vec2 vPulse; // where the glow pulsates, and each spot's place in the pulse
  ${VERTEX_NOISE}

  // Turned about the Earth's axis: a pattern sampled this way travels along the oval.
  vec3 spin(vec3 v, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * v.x + s * v.z, v.y, c * v.z - s * v.x);
  }

  void main() {
    vDir = position;
    vShell = aShell;
    vec3 d = normalize(position);
    // Most of the aurora's cost was drawing six see-through shells over the whole view only to
    // throw five away pixel by pixel. So a shell is dropped here, before any pixel is drawn,
    // wherever the fragment shader would discard it anyway: on the day side, and (all but the
    // carrier shell) wherever the view is steep enough that the shells are merged into one.
    float steep = abs(dot(normalize(cameraPosition - position), d));
    bool carrier = abs(aShell - ${(CARRIER / (SHELLS_KM.length - 1)).toFixed(3)}) < 0.05;
    if ((steep > 0.56 && !carrier) || dot(d, uSunDir) > 0.1) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    float t = uTime;
    // The map has one cell per degree, the first centred on 180° W and on the
    // south pole. Longitude comes from the sphere's own texture coordinate,
    // which is right across the seam at 180°.
    vMapUv = vec2(uv.x - 0.5 + 0.5 / ${AURORA_W}.0, (degrees(asin(clamp(d.y, -1.0, 1.0))) + 90.5) / ${AURORA_H}.0);
    vBroad = vec4(noise(d * 4.5 + vec3(0.0, t * 0.02, 3.0)),
                  0.88 + 0.12 * sin(t * 0.7 + noise(d * 3.0) * 6.28318530718),
                  noise(spin(d, t * 0.012) * 2.7 + vec3(0.0, t * 0.006, 0.0)),
                  noise(d * 9.0 + vec3(0.0, t * 0.05, 0.0)));
    vPulse = vec2(noise(d * 8.0 + 7.0), noise(d * 11.0) * 25.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Dev only: __xno.gust(1) holds a burst on, __xno.gust(null) hands it back to chance.
let forcedGust: number | null = null;
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const w = window as unknown as { __xno?: Record<string, unknown> };
  w.__xno = { ...(w.__xno ?? {}), gust: (v: number | null) => (forcedGust = v) };
}

/** A smooth wandering value between 0 and 1: different for each seed, changing about once per unit of x. */
function drift(x: number, seed: number) {
  const at = (i: number) => {
    const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const i = Math.floor(x), f = x - i;
  return THREE.MathUtils.lerp(at(i), at(i + 1), f * f * (3 - 2 * f));
}

const fragment = /* glsl */ `
  uniform sampler2D uMap; // chance of aurora, percent / 255
  uniform vec3 uSunDir;
  uniform float uTime;     // seconds, running faster the faster the solar wind
  uniform float uActivity; // 0 calm .. 1 storm
  uniform float uOpacity;
  uniform vec2 uSurge;     // a burst running along the oval: where it is (longitude, radians) and how strong (0..1)
  uniform vec2 uHue;       // how much blue and how much orange is in the light right now (0..1 each)
  varying vec3 vDir;
  varying float vShell;
  varying vec2 vMapUv;
  varying vec4 vBroad;
  varying vec2 vPulse;
  ${PIXEL_NOISE}

  const float TAU = 6.28318530718;
  const vec3 GREEN = vec3(0.22, 1.0, 0.42);  // oxygen, 557.7 nm
  const vec3 RED = vec3(1.0, 0.18, 0.4);     // oxygen, 630 nm
  const vec3 PINK = vec3(1.0, 0.32, 0.72);   // nitrogen, below 100 km
  const vec3 VIOLET = vec3(0.5, 0.36, 1.0);  // sunlit nitrogen
  const vec3 BLUE = vec3(0.2, 0.62, 1.0);    // nitrogen ions, 427.8 nm: strong aurora's blue lower parts
  const vec3 ORANGE = vec3(1.0, 0.5, 0.16);  // red and green overlapping, as bright storms show

  // What every height shares at this spot, set in main().
  float phase, lobe, glow, arcsShow, lively, tall, sunlit, front, bluish;

  // The light from one height: s is 0 at 100 km and 1 at 270 km. Colour goes
  // by height, and each height has its own shape.
  vec3 lightAt(float s) {
    float top = smoothstep(0.55, 1.0, s); // 0 up to 165 km, 1 at 270 km
    // Under lively aurora the fastest electrons reach below 100 km and light
    // nitrogen: a pink lower border, on the lowest shell.
    float border = (1.0 - smoothstep(0.0, 0.2, s)) * lively * (0.35 + 0.65 * uActivity);

    // Green arcs are thin. Red light comes from higher, thinner air and
    // spreads wider than the green arc under it: a soft halo around each arc.
    // Soft bands, not lines: aurora seen from above is a veil with no hard edge.
    float arcs = mix(pow(lobe, 2.0), 0.85 * pow(lobe, 1.3), top);
    // The pink border shows along one edge of the arc, as a curtain's lower
    // edge does when it is seen at a slant.
    if (border > 0.0) arcs = mix(arcs, 1.3 * pow(0.5 + 0.5 * cos(TAU * (phase - 0.08)), 3.0), border);

    // Green is brightest around 115 km and fades upward; red takes over above
    // 200 km, more of it the taller the rays stand.
    float weight = mix(1.0, 0.22, smoothstep(0.2, 1.0, s)) * mix(0.6, 1.0, smoothstep(0.0, 0.2, s));
    weight *= mix(1.0, mix(0.6, 3.0, tall), top) * (1.0 + border * 0.4);
    // The colours drift: some of the green turns blue in patches, and the red leans orange,
    // more of both in a burst.
    vec3 low = mix(GREEN, BLUE, bluish * (1.0 - smoothstep(0.3, 0.8, s)));
    vec3 high = mix(RED, ORANGE, clamp(uHue.y + 0.5 * front, 0.0, 1.0) * 0.8);
    vec3 col = mix(mix(low, high, smoothstep(0.45, 1.0, s)), PINK, border);
    // Near the day-night line the tops stand in sunlight above dark ground,
    // and sunlit nitrogen glows violet-blue.
    col = mix(col, VIOLET, top * sunlit * 0.75);
    return col * weight * (glow + 1.0 * arcs * arcsShow);
  }

  void main() {
    vec3 d = normalize(vDir);
    float t = uTime;
    float pixel = length(fwidth(d)); // radians across one pixel

    // Seen from above, the six shells lie on top of one another and look the
    // same as one. So where the view is steep, only one shell is drawn,
    // carrying the light of all six: a sixth of the work, just where the
    // aurora covers the most pixels. Seen at a slant they are drawn apart,
    // which is what gives the curtains their height.
    // (Separate shells only matter near the horizon; from 0.55-0.8 this was lowered to 0.3-0.5,
    // which is where most of the drawing cost went.)
    float merged = smoothstep(0.3, 0.5, abs(dot(normalize(cameraPosition - vDir), d)));
    bool carrier = abs(vShell - ${(CARRIER / (SHELLS_KM.length - 1)).toFixed(3)}) < 0.05;
    if (merged >= 1.0 && !carrier) discard;

    float sunUp = dot(d, uSunDir);
    float night = 1.0 - smoothstep(-0.2, 0.04, sunUp);
    if (night <= 0.0) discard;
    float p = texture2D(uMap, vMapUv).r * 2.55; // 0..1
    if (p < 0.012) discard;
    float base = 1.0 - exp(-p * 2.4);
    sunlit = smoothstep(-0.32, -0.08, sunUp);

    // Where the aurora is lively right now: stretches a couple of thousand km
    // long that travel west along the oval. A quiet night has a few, a storm
    // is lively nearly all the way round.
    lively = smoothstep(0.42, 0.72, vBroad.z + (uActivity - 0.35) * 0.45);
    // A burst: a bright front a few thousand km long that races along the oval. Everything in it
    // is lively, and its curtains whip like a snake.
    float lon = atan(d.z, d.x);
    float away = abs(mod(lon - uSurge.x + 3.14159265, TAU) - 3.14159265);
    front = uSurge.y * exp(-away * away / 0.18);
    lively = max(lively, front);
    bluish = clamp(0.4 * uHue.x * smoothstep(0.2, 0.9, vBroad.w) + 0.6 * front, 0.0, 1.0);
    // How tall the rays stand here: taller in lively aurora and in a disturbed
    // field, and in slow patches of its own.
    tall = clamp(vBroad.x * 0.9 + lively * 0.5 + uActivity * 0.5 - 0.25, 0.0, 1.0);

    // The model gives the oval, not the curtains inside it. Those are drawn as
    // a few thin arcs that run along the oval, wander, and come and go in
    // patches, over a soft glow. Calm arcs slide slowly; lively ones fold and
    // ripple about three times faster. (Beyond a 22% chance the arcs are set
    // further apart, so a storm's wide oval isn't ruled like a contour map.)
    float calm = lively < 0.999 ? noise(d * 6.0 + t * 0.035) * 1.8 + noise(d * 21.0 - t * 0.09) * 0.5 : 0.0;
    float wild = lively > 0.001 ? noise(d * 7.0 - t * 0.09) * 2.2 + noise(d * 24.0 + t * 0.26) * 0.8 : 0.0;
    phase = (min(p, 0.22) + max(p - 0.22, 0.0) * 0.35) * 13.0 + mix(calm, wild, lively) - t * 0.045
      + front * 0.55 * sin(lon * 46.0 - t * 5.0);
    lobe = 0.5 + 0.5 * cos(TAU * phase);
    // From far away the arcs are finer than a pixel: fall back to their average.
    float resolved = clamp(1.0 - fwidth(phase) * 1.6, 0.0, 1.0);
    arcsShow = mix(smoothstep(0.15, 0.85, vBroad.w), 1.0, lively * 0.6) * resolved;

    // No fine rays: from orbit aurora reads as soft drifting veils, and the two extra layers of
    // detail they needed cost more than anything else here (frames dropped when the aurora
    // filled a high-density screen). Lively stretches still billow, in broad slow folds.
    float rays = 1.0;
    if (lively > 0.001) rays = mix(1.0, 0.75 + 0.5 * noise(d * 30.0 + vec3(t * 0.45, -t * 0.7, t * 0.25)), lively * resolved);

    // Away from the lively stretches, patches of the soft glow switch on and
    // off every few seconds (pulsating aurora).
    float pulsing = smoothstep(0.3, 0.9, vPulse.x) * (1.0 - lively);
    float blink = smoothstep(0.3, 0.7, 0.5 + 0.5 * sin(t * 1.6 + vPulse.y));
    glow = 0.5 * mix(1.0, 0.55 + 0.8 * blink, pulsing);

    // Lively stretches are brighter, and the whole oval breathes a little.
    float lit = base * night * uOpacity * rays * (1.0 + lively * (0.35 + 0.9 * uActivity) + 1.2 * front) * vBroad.y;
    // The shells add up on screen (about four shells' worth, seen from above).
    // Bright aurora is eased toward a ceiling so it keeps its colour instead
    // of burning out to white.
    float summed = lit * (glow + 1.0 * pow(lobe, 2.0) * arcsShow) * 4.0;
    float eased = min(summed, 0.6) + 0.55 * (1.0 - exp(-max(summed - 0.6, 0.0) / 0.55));
    lit *= eased / max(summed, 1e-4);

    vec3 light = lightAt(vShell) * (1.0 - merged);
    if (carrier && merged > 0.0) {
      vec3 all = vec3(0.0);
      for (int i = 0; i < ${SHELLS_KM.length}; i++) all += lightAt(float(i) / ${SHELLS_KM.length - 1}.0);
      light += all * merged;
    }
    gl_FragColor = vec4(light * lit, 1.0);
  }
`;

function buildShells() {
  const parts: THREE.BufferGeometry[] = [];
  const cap = THREE.MathUtils.degToRad(CAP_DEG);
  SHELLS_KM.forEach((km, i) => {
    const r = 1 + km * KM;
    for (const thetaStart of [0, Math.PI - cap]) {
      const g = new THREE.SphereGeometry(r, 144, 28, 0, Math.PI * 2, thetaStart, cap); // a vertex every 2 degrees
      g.deleteAttribute('normal');
      g.setAttribute('aShell', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(i / (SHELLS_KM.length - 1)), 1));
      parts.push(g);
    }
  });
  return mergeGeometries(parts);
}

export const Aurora: React.FC = () => {
  const { mesh, material, texture, noise } = useMemo(() => {
    const noise = noiseBlock();
    const texture = new THREE.DataTexture(new Uint8Array(AURORA_W * AURORA_H), AURORA_W, AURORA_H, THREE.RedFormat, THREE.UnsignedByteType);
    texture.magFilter = texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uMap: { value: texture },
        uNoise: { value: noise },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uTime: { value: 0 },
        uActivity: { value: 0.2 },
        uSurge: { value: new THREE.Vector2(0, 0) },
        uHue: { value: new THREE.Vector2(0, 0) },
        uOpacity: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(buildShells(), material);
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    return { mesh, material, texture, noise };
  }, []);

  useEffect(() => {
    const apply = () => {
      const { aurora } = spaceWeather.get();
      if (!aurora) return;
      (texture.image.data as Uint8Array).set(aurora);
      texture.needsUpdate = true;
    };
    apply();
    return spaceWeather.subscribe(apply);
  }, [texture]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
      noise.dispose();
    },
    [mesh, material, texture, noise]
  );

  const clock = useRef(Math.random() * 1000); // so two visits don't see the same bursts

  useFrame((_, delta) => {
    const on = settings.get().aurora && spaceWeather.get().aurora !== null;
    const u = material.uniforms;
    // Fade in when the forecast arrives or the layer is switched on.
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, on ? 0.3 : 0, 3, delta);
    mesh.visible = u.uOpacity.value > 0.002;
    const drive = auroraDrive(spaceWeather.get());
    // The forecast changes every half hour; real aurora changes by the second. So, on top of the
    // real level, a burst comes through now and then (generated, not measured): for 10 to 20
    // seconds the solar wind gusts, everything speeds up and brightens, and a front races round
    // the oval. The colours drift the same way.
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    const now = clock.current;
    const gust = forcedGust ?? THREE.MathUtils.smoothstep(drift(now / 16, 1), 0.58, 0.8);
    u.uTime.value = (u.uTime.value + dt * drive.pace * (1 + 1.8 * gust)) % CLOCK_WRAP;
    u.uActivity.value = THREE.MathUtils.damp(u.uActivity.value, Math.min(1, drive.activity + 0.5 * gust), 1.2, delta);
    // The front runs west, a full turn of the oval in about 40 seconds while a burst lasts.
    u.uSurge.value.set((u.uSurge.value.x - dt * (0.05 + 0.16 * gust) * drive.pace + Math.PI * 2) % (Math.PI * 2), gust);
    u.uHue.value.set(
      THREE.MathUtils.smoothstep(drift(now / 31, 2) + 0.3 * drive.activity, 0.45, 0.85),
      THREE.MathUtils.smoothstep(drift(now / 43, 3) + 0.3 * drive.activity, 0.5, 0.9)
    );
    u.uSunDir.value.copy(world.sunDirection);
  });

  return <primitive object={mesh} />;
};
