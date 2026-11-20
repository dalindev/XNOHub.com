'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { onConfirmation, confirmationsPerSecond } from '@/lib/feed/bus';
import { ArcRing, fanOutFraction } from '@/lib/arcs/arc-ring';
import { netMode } from '@/lib/network-mode';
import { getStyleByNanoAmount } from '@/lib/get-style-by-nano-amount';

// Every arc on the globe is one instance of one mesh. A confirmation writes a
// few instance slots (start, end, timing, colour) and the vertex shader does
// all the animation from a single time uniform: one draw call, no React state,
// no per-frame geometry. Each send fans out to the other nodes (broadcast) and
// each node answers back (vote/confirmation leg).

const CAPACITY = 8192; // arc legs alive at once; ~47 full fan-outs
const SAMPLES = 24; // points along the visible part of an arc
const BROADCAST = { duration: 0.125, segment: 0.3, lift: 1.15 };
const CONFIRM = { duration: 0.225, segment: 0.1, lift: 1.15 };

export interface ArcNodes {
  /** Unit vectors (x,y,z per node) in globe-local space. */
  directions: Float32Array;
  /** Node index by rep account. */
  indexByAccount: Map<string, number>;
}

interface NetworkArcsProps {
  nodes: ArcNodes;
  radius: number;
  onPerformanceUpdate?: (cps: number, mode: string, fraction: number) => void;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uRadius;
  uniform float uPixel; // world size of one pixel at distance 1
  attribute float aT;
  attribute float aSide;
  attribute vec3 iStart;
  attribute vec3 iEnd;
  attribute vec4 iTiming; // start (s), duration (s), visible fraction, lift
  attribute vec4 iLook;   // rgb, width (px)
  attribute float iOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vEdge;

  vec3 arcPoint(float t) {
    float w = acos(clamp(dot(iStart, iEnd), -1.0, 1.0));
    vec3 p = w < 1e-4 ? mix(iStart, iEnd, t)
                      : (sin((1.0 - t) * w) * iStart + sin(t * w) * iEnd) / sin(w);
    return normalize(p) * uRadius * (1.0 + sin(t * 3.14159265) * (iTiming.w - 1.0));
  }

  void main() {
    float progress = (uTime - iTiming.x) / iTiming.y;
    float seg = iTiming.z;
    vAlpha = 0.0;
    if (progress < 0.0 || progress > 1.0 + seg) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // off screen, clipped
      return;
    }
    float head = min(progress, 1.0);
    float tail = max(progress - seg, 0.0);
    float t = mix(tail, head, aT);

    vec3 p = arcPoint(t);
    vec3 dir = arcPoint(min(t + 0.01, 1.0)) - arcPoint(max(t - 0.01, 0.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 tangent = normalize((modelViewMatrix * vec4(dir, 0.0)).xyz);
    vec3 side = normalize(cross(tangent, normalize(-mv.xyz)));
    float widthPx = iLook.w * (0.35 + 0.65 * aT); // thin tail, full head
    mv.xyz += side * aSide * widthPx * uPixel * -mv.z * 0.5;
    gl_Position = projectionMatrix * mv;

    vColor = iLook.rgb;
    vAlpha = iOpacity * aT * aT;
    vEdge = aSide;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vEdge;
  void main() {
    float a = vAlpha * (1.0 - vEdge * vEdge);
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

function buildGeometry() {
  const geo = new THREE.InstancedBufferGeometry();
  const verts = (SAMPLES + 1) * 2;
  const aT = new Float32Array(verts);
  const aSide = new Float32Array(verts);
  const index: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    aT[i * 2] = aT[i * 2 + 1] = i / SAMPLES;
    aSide[i * 2] = -1;
    aSide[i * 2 + 1] = 1;
    if (i < SAMPLES) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  geo.setIndex(index);
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));

  const inst = (size: number) => {
    const a = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * size), size);
    a.setUsage(THREE.DynamicDrawUsage);
    return a;
  };
  const attrs = {
    iStart: inst(3),
    iEnd: inst(3),
    iTiming: inst(4),
    iLook: inst(4),
    iOpacity: inst(1)
  };
  Object.entries(attrs).forEach(([k, a]) => geo.setAttribute(k, a));
  // Everything starts "finished" so unused slots draw nothing.
  attrs.iTiming.array.fill(-1e6);
  for (let i = 0; i < CAPACITY; i++) attrs.iTiming.array[i * 4 + 1] = 1;
  geo.instanceCount = 0;
  return { geo, attrs };
}

const shuffleInPlace = (a: number[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const NetworkArcs: React.FC<NetworkArcsProps> = ({ nodes, radius, onPerformanceUpdate }) => {
  const { size, camera } = useThree();
  const { geo, attrs } = useMemo(() => buildGeometry(), []);
  const ring = useMemo(() => new ArcRing(CAPACITY), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uRadius: { value: radius },
          uPixel: { value: 0.001 }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        premultipliedAlpha: true
      }),
    [radius]
  );
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => () => {
    geo.dispose();
    material.dispose();
  }, [geo, material]);

  useEffect(() => {
    const color = new THREE.Color();
    // Arc clock = seconds since page load, same as uTime below.
    const now = () => performance.now() / 1000;

    const writeLeg = (
      from: number,
      to: number,
      start: number,
      duration: number,
      leg: typeof BROADCAST,
      width: number,
      opacity: number
    ) => {
      const { directions } = nodesRef.current;
      const s = ring.claim();
      attrs.iStart.array.set(directions.subarray(from * 3, from * 3 + 3), s * 3);
      attrs.iEnd.array.set(directions.subarray(to * 3, to * 3 + 3), s * 3);
      const seg = leg.segment * (0.5 + Math.random()); // varies per arc, fixed for its life
      attrs.iTiming.array.set([start, duration, seg, leg.lift], s * 4);
      attrs.iLook.array.set([color.r, color.g, color.b, width], s * 4);
      attrs.iOpacity.array[s] = opacity;
    };

    return onConfirmation((c, amount) => {
      if (netMode.get().mode !== 'classic') return; // NetworkPackets draws the routed modes
      const { directions, indexByAccount } = nodesRef.current;
      const n = directions.length / 3;
      if (n < 2) return;
      // The block names the account's representative; when it isn't on the
      // map (or we don't know where it is) the broadcast starts at a random node.
      const source = indexByAccount.get(c.message.block.representative) ?? Math.floor(Math.random() * n);
      const others: number[] = [];
      for (let i = 0; i < n; i++) if (i !== source) others.push(i);
      const k = Math.max(1, Math.floor(others.length * fanOutFraction(confirmationsPerSecond())));
      const targets = k < others.length ? shuffleInPlace(others).slice(0, k) : others;

      const style = getStyleByNanoAmount(amount);
      color.setHex(style.color);
      const width = (style.lineWidth ?? 1) * 1.5;
      const opacity = style.opacity ?? 0.8;
      const t0 = now();
      for (const target of targets) {
        const m = 0.25 + Math.random() * 1.5;
        const out = BROADCAST.duration * m;
        writeLeg(source, target, t0, out, BROADCAST, width, opacity);
        writeLeg(target, source, t0 + out, CONFIRM.duration * m, CONFIRM, width, opacity);
      }
    });
  }, [attrs, ring]);

  useEffect(() => {
    if (!onPerformanceUpdate) return;
    const id = setInterval(() => {
      const cps = confirmationsPerSecond();
      const f = fanOutFraction(cps);
      const mode = f === 1 ? 'Full Experience' : f > 0.1 ? 'Balanced' : f > 0.03 ? 'Performance' : 'Performance Max';
      onPerformanceUpdate(cps, mode, f);
    }, 1000);
    return () => clearInterval(id);
  }, [onPerformanceUpdate]);

  useFrame(() => {
    material.uniforms.uTime.value = performance.now() / 1000;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;
    material.uniforms.uPixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)) / size.height;
    const dirty = ring.takeDirty();
    if (dirty) {
      const [offset, count] = dirty;
      for (const a of Object.values(attrs)) {
        a.clearUpdateRanges();
        a.addUpdateRange(offset * a.itemSize, count * a.itemSize);
        a.needsUpdate = true;
      }
      geo.instanceCount = ring.count;
    }
  });

  return <mesh geometry={geo} material={material} frustumCulled={false} renderOrder={2} />;
};

export default NetworkArcs;
