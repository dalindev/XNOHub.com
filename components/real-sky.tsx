'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { NAMED_STARS, decodeStars, planetsAt, raDecToSky, skyOrientation, starColor, type Planet } from '@/lib/sky';
import { moonFix, sunFix } from '@/lib/astro';
import { simNow } from '@/lib/sim-clock';
import { settings } from '@/lib/settings';
import { seaLevelAltitude, world as worldState } from '@/lib/world'; // RealSky has its own `world` vector
import { EARTH_RADIUS_KM } from '@/lib/geo';
import { transmittance } from '@/lib/sky-model';

// The real sky, as the eye would see it from just outside the atmosphere:
//  - 9,096 stars from the Yale Bright Star Catalogue at their true places,
//    brightness (magnitude) and colour (B-V);
//  - the Milky Way from NASA's Gaia-based sky map;
//  - the five naked-eye planets where they are tonight, at their real brightness;
//  - the Sun's disc at its true angular size (0.53°), with glare.
// Everything sits on a sphere centred on the camera (the sky is at infinity)
// and turns with the Earth-fixed scene, so the sky over any place is right
// for the simulated time.

const R = 480; // inside the camera's far plane (1000)
const SUN_QUAD_DEG = 22; // glare reaches this far from the Sun
const SUN_RADIUS_DEG = 0.2666;

const starVertex = /* glsl */ `
  uniform float uDpr;
  uniform vec3 uSun; // direction to the Sun, in the sky's own frame
  uniform float uGain; // the camera look's star gain (1 to the eye)
  uniform float uMagLimit; // and the faintest magnitude it records, with a 1-magnitude fade
  attribute vec3 aColor;
  attribute float aMag;
  varying vec3 vColor;
  varying float vHot;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Brighter stars are drawn larger; below ~2 px they dim instead of shrinking.
    // The dimming is gentler than the true 2.5× per magnitude so the faintest
    // naked-eye stars still register on a screen.
    float size = 2.0 + 0.8 * max(4.8 - aMag, 0.0);
    float dim = aMag > 4.8 ? pow(10.0, -0.26 * (aMag - 4.8)) : 1.0;
    gl_PointSize = size * uDpr;
    // Glare: stars within ~30° of the Sun are washed out.
    float glare = smoothstep(0.86, 0.998, dot(normalize(position), uSun));
    float cam = uGain * clamp(uMagLimit - aMag, 0.0, 1.0);
    vColor = aColor * dim * (1.0 - 0.92 * glare) * cam;
    vHot = clamp((size - 3.0) / 4.0, 0.0, 1.0) * (1.0 - glare) * cam;
  }
`;

const starFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vHot;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = exp(-r * r * 3.2);
    float hot = exp(-r * r * 20.0) * vHot; // white-hot centre on the brightest
    gl_FragColor = vec4(vColor * core + vec3(hot) * 0.7, 1.0);
  }
`;

const milkyWayVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The map is plate carrée in J2000: RA 0h in the middle, increasing to the left.
// It gives the Milky Way's real shape, brightness and colour, but it is small
// (a third of a degree per pixel), so on its own it is a soft blur. The fine
// detail is built here: the glow is broken into the countless faint stars it
// really is (more of them where the map is brighter), and the dust lanes get
// finer mottling. That detail is generated, not catalogued.
const milkyWayFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uGain;
  uniform vec3 uSun;
  uniform float uPixel; // angle of one screen pixel at the centre of the view, radians
  varying vec3 vDir;

  vec3 hash3(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
  }
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

  // Faint stars: at most one per cell of a grid laid over the faces of a cube
  // around the viewer, each about a pixel and a half wide, most of them dim.
  float grain(vec3 d, float cellPx, float seed) {
    vec3 a = abs(d);
    vec2 uv;
    float face;
    if (a.x >= a.y && a.x >= a.z) { uv = d.yz / a.x; face = d.x > 0.0 ? 0.0 : 1.0; }
    else if (a.y >= a.z) { uv = d.xz / a.y; face = d.y > 0.0 ? 2.0 : 3.0; }
    else { uv = d.xy / a.z; face = d.z > 0.0 ? 4.0 : 5.0; }
    float cells = floor(1.0 / (uPixel * cellPx));
    vec2 g = uv * cells;
    vec2 cell = floor(g);
    vec3 h = hash3(vec3(cell, face * 17.0 + seed));
    vec2 centre = cell + 0.2 + 0.6 * h.xy;
    // Pixels per cell here (the cube face stretches toward its edges).
    float px = uPixel * cells * (1.0 + dot(uv, uv));
    float dist = length(g - centre) / px;
    // Most are very dim, a few stand out: star counts climb steeply with faintness.
    return exp(-dist * dist * 2.2) * pow(h.z, 9.0);
  }

  void main() {
    vec3 d = normalize(vDir);
    float ra = atan(-d.z, d.x);
    float dec = asin(clamp(d.y, -1.0, 1.0));
    vec2 uv = vec2(0.5 - ra / 6.28318530718, 0.5 + dec / 3.14159265359);
    // The picture's black level and noise are removed when it is built
    // (scripts/build-small-maps.py).
    vec3 glow = texture2D(uMap, uv).rgb;
    float lum = dot(glow, vec3(0.333));
    vec3 col = glow;
    if (lum > 0.004) {
      // Dust: finer mottling than the map can hold, stronger where there is light to block.
      float dust = noise(d * 48.0) * 0.55 + noise(d * 130.0) * 0.45;
      col *= mix(1.0, 0.55 + 0.9 * dust, 0.55);
      // Stars: the glow is unresolved starlight, so sprinkle it back as points.
      float stars = grain(d, 3.0, 0.0) + grain(d, 5.0, 41.0);
      vec3 tint = mix(vec3(1.0), glow / max(lum, 1e-3), 0.5);
      col = col * 0.8 + tint * stars * smoothstep(0.02, 0.45, lum) * 0.85;
    }
    float glare = smoothstep(0.80, 0.995, dot(d, uSun));
    gl_FragColor = vec4(col * uGain * (1.0 - 0.95 * glare), 1.0);
  }
`;

const sunVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragment = /* glsl */ `
  uniform float uDisc; // disc radius as a fraction of the quad's half size
  uniform float uGain; // the disc's brightness: 1 to the eye, far more when the camera look's bloom draws the glare
  uniform float uGlare; // the painted glare: 1 to the eye, 0 when bloom does it
  uniform vec3 uTint; // what gets through the air toward the Sun: redder and dimmer low down
  varying vec2 vUv;
  void main() {
    float r = length(vUv);
    if (r > 1.0) discard;
    float x = r / uDisc; // 1 at the Sun's limb
    float edge = 1.0 - smoothstep(0.5, 1.0, r);
    float disc = 1.0 - smoothstep(0.9, 1.05, x);
    float bloom = 0.9 / (1.0 + pow(x * 0.42, 2.0)); // tight, around the disc
    float veil = 0.2 * pow(1.0 - r, 5.0);           // wide and faint, as in a lens or an eye
    vec3 col = vec3(1.0, 0.98, 0.93) * disc * 3.0 * uGain
             + (vec3(1.0, 0.93, 0.8) * bloom * edge + vec3(1.0, 0.88, 0.74) * veil) * uGlare;
    gl_FragColor = vec4(col * uTint, 1.0);
  }
`;

let starsPending: Promise<ReturnType<typeof decodeStars>> | null = null;
const loadStars = () =>
  (starsPending ??= fetch('/sky/stars.bin')
    .then((r) => {
      if (!r.ok) throw new Error(`stars.bin: HTTP ${r.status}`);
      return r.arrayBuffer();
    })
    .then(decodeStars)
    .catch((e) => {
      starsPending = null;
      throw e;
    }));

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

interface Props {
  /** The night sky (stars, Milky Way, planets); hidden by Sky in bright daylight near the ground. */
  nightRef: React.RefObject<THREE.Group | null>;
}

export const RealSky: React.FC<Props> = ({ nightRef }) => {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  // Built in one memo: React may run a memo twice in dev, and objects moved
  // between two results would end up in the discarded one.
  const sky = useMemo(() => {
    const night = new THREE.Group();

    const milkyWayMat = new THREE.ShaderMaterial({
      vertexShader: milkyWayVertex,
      fragmentShader: milkyWayFragment,
      uniforms: { uMap: { value: null }, uGain: { value: 0 }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uPixel: { value: 0.001 } },
      side: THREE.BackSide,
      ...additive
    });
    const milkyWay = new THREE.Mesh(new THREE.SphereGeometry(R * 0.99, 48, 24), milkyWayMat);
    milkyWay.renderOrder = -20;

    const starMat = new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: { uDpr: { value: 1 }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uGain: { value: 1 }, uMagLimit: { value: 1000 } },
      ...additive
    });
    const stars = new THREE.Points(new THREE.BufferGeometry(), starMat);
    stars.renderOrder = -19;

    const planetGeo = new THREE.BufferGeometry();
    planetGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(5 * 3), 3));
    planetGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(5 * 3), 3));
    planetGeo.setAttribute('aMag', new THREE.BufferAttribute(new Float32Array(5).fill(99), 1));
    const planets = new THREE.Points(planetGeo, starMat);
    planets.renderOrder = -18;

    const half = R * Math.tan(THREE.MathUtils.degToRad(SUN_QUAD_DEG));
    const sunMat = new THREE.ShaderMaterial({
      vertexShader: sunVertex,
      fragmentShader: sunFragment,
      uniforms: {
        uDisc: { value: Math.tan(THREE.MathUtils.degToRad(SUN_RADIUS_DEG)) / Math.tan(THREE.MathUtils.degToRad(SUN_QUAD_DEG)) },
        uGain: { value: 1 },
        uGlare: { value: 1 },
        uTint: { value: new THREE.Vector3(1, 1, 1) }
      },
      ...additive
    });
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), sunMat);
    sun.renderOrder = -17;

    milkyWay.name = 'milky-way';
    stars.name = 'stars';
    planets.name = 'planets';
    sun.name = 'sun';
    for (const o of [milkyWay, stars, planets, sun]) o.frustumCulled = false;
    night.add(milkyWay, stars, planets);
    return { night, milkyWay, milkyWayMat, stars, starMat, planets, sun, sunMat };
  }, []);

  useEffect(() => {
    let live = true;
    loadStars()
      .then((s) => {
        if (!live) return;
        const pos = new Float32Array(s.n * 3), col = new Float32Array(s.n * 3);
        const v = new THREE.Vector3(), c = new THREE.Color();
        for (let i = 0; i < s.n; i++) {
          raDecToSky(s.ra[i], s.dec[i], v).multiplyScalar(R).toArray(pos, i * 3);
          starColor(s.bv[i], c).toArray(col, i * 3);
        }
        const g = sky.stars.geometry;
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
        g.setAttribute('aMag', new THREE.BufferAttribute(s.mag, 1));
      })
      .catch((e) => console.error(e));

    const tex = new THREE.TextureLoader().load('/sky/milkyway-1k.jpg', (t) => {
      // Keep the picture's own tone curve: sampled and shown as is.
      t.colorSpace = THREE.NoColorSpace;
      t.wrapS = THREE.RepeatWrapping;
      t.generateMipmaps = false; // the RA seam would show through mip selection
      t.minFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      if (!live) return;
      sky.milkyWayMat.uniforms.uMap.value = t;
      sky.milkyWayMat.uniforms.uGain.value = 0.85;
    });
    return () => {
      live = false;
      tex.dispose();
    };
  }, [sky]);

  useEffect(
    () => () => {
      sky.milkyWay.geometry.dispose();
      sky.milkyWayMat.dispose();
      sky.stars.geometry.dispose();
      sky.starMat.dispose();
      sky.planets.geometry.dispose();
      sky.sun.geometry.dispose();
      sky.sunMat.dispose();
    },
    [sky]
  );

  // Labels are plain DOM over the canvas: a few names, moved each frame.
  const labels = useRef<{ el: HTMLSpanElement; dir: THREE.Vector3; moon?: boolean }[]>([]);
  const planetNow = useRef<Planet[]>([]);
  useEffect(() => {
    const host = gl.domElement.parentElement;
    if (!host) return;
    const box = document.createElement('div');
    box.className = 'absolute inset-0 overflow-hidden pointer-events-none select-none';
    const make = (name: string, planet: boolean) => {
      const el = document.createElement('span');
      el.textContent = name;
      el.className = `absolute left-0 top-0 whitespace-nowrap text-[10px] tracking-wide ${planet ? 'text-amber-100/80' : 'text-slate-300/55'}`;
      el.style.display = 'none';
      box.appendChild(el);
      return el;
    };
    labels.current = [
      ...NAMED_STARS.map((s) => ({ el: make(s.name, false), dir: raDecToSky(s.ra, s.dec) })),
      ...['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((n) => ({ el: make(n, true), dir: new THREE.Vector3() })),
      { el: make('Moon', true), dir: new THREE.Vector3(), moon: true }
    ];
    host.appendChild(box);
    return () => {
      labels.current = [];
      box.remove();
    };
  }, [gl]);

  const lastPlanets = useRef({ wall: -Infinity, sim: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const world = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const unspin = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(), []);
  const sunTint = useMemo(() => [1, 1, 1], []);

  useFrame((state) => {
    const { night, starMat, planets, sun } = sky;
    const date = simNow();
    // What the camera records (components/camera-look); the eye's values otherwise.
    const look = worldState.look;
    starMat.uniforms.uGain.value = look.starGain;
    starMat.uniforms.uMagLimit.value = look.magLimit;
    sky.sunMat.uniforms.uGain.value = look.sunDisc;
    sky.sunMat.uniforms.uGlare.value = look.sunGlare;
    sky.milkyWay.visible = !look.on; // far too faint for a webcast camera
    night.position.copy(camera.position);
    skyOrientation(date, night.quaternion);
    starMat.uniforms.uDpr.value = state.viewport.dpr;
    const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
    sky.milkyWayMat.uniforms.uPixel.value = (2 * Math.tan(fov / 2)) / (state.size.height * state.viewport.dpr);

    const sunDir = sunFix(date).direction;
    sun.position.copy(sunDir).multiplyScalar(R).add(camera.position);
    // In the Starship view's camera look, seen through the air above the
    // camera: dimmer and redder low down (straight to the canvas, only redder:
    // there the disc isn't drawn bright enough to stay visible dimmed). To the
    // eye, in every other view, as before.
    if (look.on) {
      transmittance(up.copy(camera.position).normalize().dot(sunDir), seaLevelAltitude() * EARTH_RADIUS_KM, sunTint);
      const most = Math.max(sunTint[0], sunTint[1], sunTint[2]);
      if (look.sunDisc <= 1 && most > 0) for (let i = 0; i < 3; i++) sunTint[i] /= most;
    } else sunTint.fill(1);
    sky.sunMat.uniforms.uTint.value.fromArray(sunTint);
    sun.quaternion.copy(camera.quaternion);
    // The same direction in the sky's own frame, for washing out stars near the Sun.
    unspin.copy(night.quaternion).invert();
    starMat.uniforms.uSun.value.copy(sunDir).applyQuaternion(unspin);
    sky.milkyWayMat.uniforms.uSun.value.copy(starMat.uniforms.uSun.value);

    // Planets drift slowly: once a second, or at once when the clock jumps.
    const wall = state.clock.elapsedTime;
    if (wall - lastPlanets.current.wall > 1 || Math.abs(date.getTime() - lastPlanets.current.sim) > 3_600_000) {
      lastPlanets.current = { wall, sim: date.getTime() };
      planetNow.current = planetsAt(date);
      const pos = planets.geometry.getAttribute('position') as THREE.BufferAttribute;
      const col = planets.geometry.getAttribute('aColor') as THREE.BufferAttribute;
      const mag = planets.geometry.getAttribute('aMag') as THREE.BufferAttribute;
      const c = new THREE.Color();
      planetNow.current.forEach((p, i) => {
        pos.setXYZ(i, p.direction.x * R, p.direction.y * R, p.direction.z * R);
        c.setHex(p.color);
        col.setXYZ(i, c.r, c.g, c.b);
        mag.setX(i, p.magnitude);
        const label = labels.current[NAMED_STARS.length + i];
        if (label) label.dir.copy(p.direction);
      });
      pos.needsUpdate = col.needsUpdate = mag.needsUpdate = true;
    }

    // Labels: hidden behind the Earth, off screen, in daylight, through the
    // Starship view's camera, or when switched off.
    const show = settings.get().skyLabels && night.visible && !look.on;
    const camPos = camera.position;
    const camR2 = camPos.lengthSq();
    camera.getWorldDirection(forward);
    const moon = show ? moonFix(date) : null;
    for (const l of labels.current) {
      let visible = show;
      if (visible) {
        // Stars and planets are directions on the sky; the Moon is a place, 60 Earth radii out.
        if (l.moon && moon) world.copy(moon.direction).multiplyScalar(moon.distance).sub(camPos).normalize();
        else world.copy(l.dir).applyQuaternion(night.quaternion);
        const b = camPos.dot(world); // < 0: looking back toward the Earth's side
        if (world.dot(forward) < 0.1) visible = false; // behind the camera
        else if (b < 0 && camR2 - b * b < 1.03 * 1.03) visible = false; // behind the Earth
        else {
          tmp.copy(world).multiplyScalar(R).add(camPos).project(camera);
          if (Math.abs(tmp.x) > 1 || Math.abs(tmp.y) > 1) visible = false;
          else {
            const x = (tmp.x * 0.5 + 0.5) * state.size.width + 8;
            const y = (-tmp.y * 0.5 + 0.5) * state.size.height - 7;
            l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          }
        }
      }
      const display = visible ? '' : 'none';
      if (l.el.style.display !== display) l.el.style.display = display;
    }
  });

  return (
    <>
      <primitive object={sky.night} ref={nightRef} />
      <primitive object={sky.sun} />
    </>
  );
};
