'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { cloudDay, cloudImageUrls, cloudWidth, setCloudSource } from '@/lib/live-clouds';
import { sunFix } from '@/lib/astro';
import { settings } from '@/lib/settings';
import { world } from '@/lib/world';

// The cloud layer: yesterday's real clouds from NASA's VIIRS mosaic (see
// lib/live-clouds), lit by the simulated Sun: white by day, warm along the
// terminator, and a dark veil over the city lights at night. If NASA can't
// be reached it falls back to the bundled cloud picture.
//
// The photo has no data where the Sun was low when the satellite passed (the
// far north in winter, the far south in summer). The layer cross-fades to a
// small picture of typical clouds there, so the edge of the data doesn't show.
//
// The shell sits ~20 km up so it clears terrain, and has the Earth's slightly
// flattened shape. It fades out as the camera comes close, where a picture
// this coarse stops being convincing.

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vDir;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vDir = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uFill;  // typical clouds, for where the photo has no data
  uniform float uHasFill;
  uniform float uPhoto;     // 1: true-colour satellite photo, 0: the bundled cloud picture (cover in alpha)
  uniform float uImageDecl; // Sun's declination (rad) on the photo's day
  uniform vec3 uSunDir;
  uniform float uOpacity;
  uniform float uDetail;    // 0 from far away .. 1 close up
  varying vec2 vUv;
  varying vec3 vDir;
  varying vec3 vView;

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

  // How much cloud a pixel of the satellite photo shows: bright and colourless
  // is cloud (or snow and ice); land is warm-toned, sea and reefs are saturated.
  float cloudIn(vec3 c) {
    float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float sat = (mx - mn) / max(mx, 1e-3);
    float warm = max(c.r - c.b, 0.0) / max(mx, 1e-3);
    float white = (1.0 - smoothstep(0.05, 0.18, warm)) * (1.0 - smoothstep(0.35, 0.6, sat));
    return smoothstep(0.33, 0.9, lum) * white;
  }

  // Cloud cover at a place: from the photo where it has data, typical clouds where it doesn't.
  float coverAt(vec2 uv, float data) {
    vec4 texel = texture2D(uMap, uv);
    float cover = mix(texel.a, cloudIn(texel.rgb), uPhoto);
    return mix(texture2D(uFill, uv).r * uHasFill, cover, data);
  }

  void main() {
    vec3 n = normalize(vDir);
    // The photo stops where the Sun stood less than about 10° high when the
    // satellite passed (13:30 local time). "noon" is the sine of that height.
    float cosLat = sqrt(max(1.0 - n.y * n.y, 0.0));
    float noon = n.y * sin(uImageDecl) + cosLat * cos(uImageDecl) * 0.924;
    float data = mix(1.0, smoothstep(0.18, 0.27, noon), uPhoto);
    float cover = coverAt(vUv, data);

    // A little relief: compare with the cloud ~25 km toward the Sun. Thicker
    // cloud that way means this spot is on the shaded side of a cloud bank.
    vec3 east = normalize(vec3(n.z, 0.0, -n.x) + vec3(1e-5, 0.0, 0.0));
    vec3 north = cross(n, east);
    vec2 toSun = vec2(dot(uSunDir, east) / max(cosLat, 0.2) / 6.28318530718, dot(uSunDir, north) / 3.14159265359) * 0.004;
    float relief = clamp(1.0 + (cover - coverAt(vUv + toSun, data)) * 1.5, 0.7, 1.12);

    // Close up, break the picture's blur with finer procedural detail at cloud edges.
    if (uDetail > 0.0) {
      float fine = noise(n * 380.0) * 0.6 + noise(n * 900.0) * 0.4;
      float edge = smoothstep(0.02, 0.35, cover) * (1.0 - smoothstep(0.6, 0.98, cover));
      cover = clamp(cover + (fine - 0.5) * 0.7 * edge * uDetail, 0.0, 1.0);
    }
    if (cover < 0.01) discard;

    float ndl = dot(n, uSunDir);
    float day = smoothstep(-0.1, 0.22, ndl);
    vec3 sunlit = mix(vec3(1.0, 0.72, 0.55), vec3(0.97, 0.98, 1.0), smoothstep(-0.02, 0.14, ndl)); // warm at sunrise and sunset
    vec3 dark = vec3(0.06, 0.075, 0.11); // faintly moonlit, like the ground under it
    vec3 col = mix(dark, sunlit * mix(0.78, 1.0, cover) * relief, day);

    // Thicker toward the limb, where the line of sight crosses more cloud.
    float limb = 1.0 - abs(dot(n, vView));
    float alpha = cover * mix(0.62, 0.94, day) * (1.0 + 0.35 * limb * limb);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * uOpacity);
  }
`;

// WGS84 radii in mean Earth radii: the shell follows the Earth's real shape.
const EQUATORIAL = 6378.137 / 6371;
const POLAR = 6356.752 / 6371;
const ALTITUDE = 1.0032;
const ARCHIVE_PICTURE = '/earth/clouds-4k.ktx2'; // built by scripts/build-earth-textures.sh

export const CloudMesh = ({ meshRef }: { meshRef?: React.RefObject<THREE.Mesh | null> } = {}) => {
  const gl = useThree((s) => s.gl);

  const { mesh, material } = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uMap: { value: null },
        uFill: { value: null },
        uHasFill: { value: 0 },
        uPhoto: { value: 1 },
        uImageDecl: { value: 0 },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uOpacity: { value: 0 },
        uDetail: { value: 0 }
      },
      transparent: true,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), material);
    mesh.scale.set(EQUATORIAL * ALTITUDE, POLAR * ALTITUDE, EQUATORIAL * ALTITUDE);
    mesh.renderOrder = 0.5; // over the surface, under every glowing layer
    mesh.visible = false;
    return { mesh, material };
  }, []);

  useEffect(() => {
    let live = true;
    let texture: THREE.Texture | null = null;
    let fill: THREE.Texture | null = null;
    const show = (t: THREE.Texture, photo: boolean, day: string | null) => {
      if (!live) return t.dispose();
      texture = t;
      material.uniforms.uMap.value = t;
      material.uniforms.uPhoto.value = photo ? 1 : 0;
      if (day) material.uniforms.uImageDecl.value = THREE.MathUtils.degToRad(sunFix(new Date(`${day}T12:00:00Z`)).lat);
      setCloudSource({ state: photo ? 'live' : 'archive', day });
    };

    const archive = () => {
      const loader = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(gl);
      loader.load(
        ARCHIVE_PICTURE,
        (t) => {
          show(t, false, null);
          loader.dispose();
        },
        undefined,
        (e) => console.error(e)
      );
    };

    const day = cloudDay();
    const urls = cloudImageUrls(day, cloudWidth());
    const tryNext = (i: number) => {
      if (i >= urls.length) return archive();
      new THREE.TextureLoader().load(
        urls[i],
        (t) => {
          t.colorSpace = THREE.NoColorSpace; // read as the photo's own values
          t.anisotropy = 4;
          show(t, true, day);
          fill = new THREE.TextureLoader().load('/earth/clouds-fill-1k.jpg', (f) => {
            f.colorSpace = THREE.NoColorSpace;
            if (!live) return;
            material.uniforms.uFill.value = f;
            material.uniforms.uHasFill.value = 1;
          });
        },
        undefined,
        () => live && tryNext(i + 1)
      );
    };
    tryNext(0);

    return () => {
      live = false;
      texture?.dispose();
      fill?.dispose();
    };
  }, [gl, material]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      material.dispose();
    },
    [mesh, material]
  );

  useFrame((_, delta) => {
    const u = material.uniforms;
    const strength = u.uMap.value !== null ? settings.get().clouds : 0;
    // The photo shows 5 to 20 km per pixel: from close up it is only a grey
    // blur over the ground. Gone below ~200 km, full above ~700 km.
    const above = THREE.MathUtils.smoothstep(world.altitude, 0.03, 0.11);
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, above * strength, 4, delta);
    mesh.visible = u.uOpacity.value > 0.003;
    u.uDetail.value = 1 - THREE.MathUtils.smoothstep(world.altitude, 0.08, 0.5);
    u.uSunDir.value.copy(world.sunDirection);
  });

  return <primitive object={mesh} ref={meshRef} />;
};
