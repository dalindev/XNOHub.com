'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { RepNode } from '@/types/index';
import { onConfirmation, confirmationsPerSecond } from '@/lib/feed/bus';
import { FibreNetwork, type CablesFile } from '@/lib/routing/fiber';
import { SpaceNetwork } from '@/lib/routing/space';
import { surfacePolyline, cumulative, pointAt, firstAfter } from '@/lib/routing/polyline';
import { constellation, allSatScene } from '@/lib/constellation';
import { simNowMs } from '@/lib/sim-clock';
import { netMode, type RaceStats } from '@/lib/network-mode';

// Each confirmation as glowing packets travelling real routes: along submarine
// cables at the speed of light in glass, or up to Starlink, across the laser
// mesh at the speed of light in vacuum, and back down. Timing is real
// propagation delay × netMode.slowMo (a 40 ms hop would be invisible at 1×).
// Broadcast first (sender → receiver), then the vote comes back.
//
// Satellites are drawn tiny (true scale is invisible); the packet heads are a
// fixed number of pixels so they read from any distance.

const MAX_PACKETS = 900;
const MAX_SEGMENTS = 60_000;
const MAX_FLASHES = 300;
const STATS_SAMPLE = 40; // receivers timed per confirmation for the dashboard
const LIFT = 1.0015;

const FIBRE = new THREE.Color(0xffb347);
const SPACE = new THREE.Color(0x6fe3ff);

interface Packet {
  pts: THREE.Vector3[];
  cum: Float32Array;
  t0: number;
  dur: number;
  trail: number;
  color: THREE.Color;
  size: number;
  gain: number;
}

interface Flash {
  p: THREE.Vector3;
  t0: number;
  color: THREE.Color;
  size: number;
}

const headVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform float uDpr;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uDpr;
    vColor = aColor;
  }
`;
const headFragment = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.35, 0.0, d);
    float halo = pow(1.0 - d, 2.0) * 0.6;
    vec3 col = vColor * (core + halo) + vec3(core * 0.8);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const now = () => performance.now() / 1000;

function reversed(pts: THREE.Vector3[]) {
  const r = [...pts].reverse();
  return { pts: r, cum: cumulative(r) };
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  reps: RepNode[];
  cables: CablesFile;
}

export const NetworkPackets: React.FC<Props> = ({ reps, cables }) => {
  const drawn = useMemo(() => reps.filter((r) => r.lat !== null && r.lon !== null), [reps]);
  const index = useMemo(() => new Map(drawn.map((r, i) => [r.account, i])), [drawn]);
  const geo = useMemo(() => drawn.map((r) => ({ lat: r.lat!, lon: r.lon! })), [drawn]);

  const fibreRef = useRef<FibreNetwork | null>(null);
  const spaceRef = useRef<{ net: SpaceNetwork; sim: number; wall: number; linked: Set<number> } | null>(null);
  const packets = useRef<Packet[]>([]);
  const flashes = useRef<Flash[]>([]);
  const fibrePaths = useRef(new Map<string, { pts: THREE.Vector3[]; cum: Float32Array }>());

  // The fibre graph takes ~100-300 ms to build; do it off the first frame.
  useEffect(() => {
    fibreRef.current = null;
    fibrePaths.current.clear();
    const id = setTimeout(() => {
      fibreRef.current = new FibreNetwork(cables, geo);
    }, 50);
    return () => clearTimeout(id);
  }, [cables, geo]);

  const space = () => {
    const rows = constellation.rows;
    if (!rows.length) return null;
    const sim = simNowMs();
    const wall = performance.now();
    const s = spaceRef.current;
    // Satellites move ~7.6 km/s: refresh the snapshot every 5 s of sim time.
    if (s && (Math.abs(sim - s.sim) < 5000 || wall - s.wall < 250)) return s;
    const linked = s?.linked ?? new Set(constellation.links.flat());
    spaceRef.current = { net: new SpaceNetwork(allSatScene(), constellation.links), sim, wall, linked };
    return spaceRef.current;
  };

  const { trails, heads, trailPos, trailCol, headPos, headCol, headSize, headMat } = useMemo(() => {
    const trailPos = new Float32Array(MAX_SEGMENTS * 6);
    const trailCol = new Float32Array(MAX_SEGMENTS * 6);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
    tg.setAttribute('color', new THREE.BufferAttribute(trailCol, 3).setUsage(THREE.DynamicDrawUsage));
    const trails = new THREE.LineSegments(
      tg,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );

    const n = MAX_PACKETS + MAX_FLASHES;
    const headPos = new Float32Array(n * 3), headCol = new Float32Array(n * 3), headSize = new Float32Array(n);
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(headPos, 3).setUsage(THREE.DynamicDrawUsage));
    hg.setAttribute('aColor', new THREE.BufferAttribute(headCol, 3).setUsage(THREE.DynamicDrawUsage));
    hg.setAttribute('aSize', new THREE.BufferAttribute(headSize, 1).setUsage(THREE.DynamicDrawUsage));
    const headMat = new THREE.ShaderMaterial({
      vertexShader: headVertex,
      fragmentShader: headFragment,
      uniforms: { uDpr: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const heads = new THREE.Points(hg, headMat);
    trails.frustumCulled = heads.frustumCulled = false;
    trails.renderOrder = 4;
    heads.renderOrder = 5;
    return { trails, heads, trailPos, trailCol, headPos, headCol, headSize, headMat };
  }, []);

  useEffect(
    () => () => {
      trails.geometry.dispose();
      (trails.material as THREE.Material).dispose();
      heads.geometry.dispose();
      headMat.dispose();
    },
    [trails, heads, headMat]
  );

  useEffect(() => {
    const addPacket = (path: { pts: THREE.Vector3[]; cum: Float32Array }, t0: number, ms: number, color: THREE.Color, vote: boolean) => {
      if (packets.current.length >= MAX_PACKETS) return;
      const total = path.cum[path.cum.length - 1];
      packets.current.push({
        pts: path.pts,
        cum: path.cum,
        t0,
        dur: Math.max(0.05, (ms / 1000) * netMode.get().slowMo),
        trail: Math.min(total * 0.4, 0.3),
        color,
        size: vote ? 6 : 11,
        gain: vote ? 0.45 : 1
      });
    };
    const flash = (p: THREE.Vector3, t0: number, color: THREE.Color, size: number) => {
      if (flashes.current.length < MAX_FLASHES) flashes.current.push({ p, t0, color, size });
    };

    if (process.env.NODE_ENV === 'development') {
      const w = window as unknown as { __xno?: Record<string, unknown> };
      w.__xno = { ...(w.__xno ?? {}), packets: () => ({ packets: packets.current.length, fibreReady: !!fibreRef.current }) };
    }

    return onConfirmation((c) => {
      const { mode } = netMode.get();
      if (mode === 'classic' || geo.length < 2) return;
      const fibre = fibreRef.current;
      const sp = mode === 'cables' ? null : space();
      const src = index.get(c.message.block.representative) ?? Math.floor(Math.random() * geo.length);
      const others = shuffle(Array.from({ length: geo.length }, (_, i) => i).filter((i) => i !== src));
      const cps = Math.max(1, confirmationsPerSecond());
      const drawCount = Math.max(3, Math.min(24, Math.round(24 / cps))) >> (mode === 'race' ? 1 : 0);
      const t0 = now();

      let fSum = 0, fMax = 0, sSum = 0, sMax = 0, n = 0, wins = 0;
      let lastCables: string[] = [];
      others.slice(0, Math.max(STATS_SAMPLE, drawCount)).forEach((tgt, k) => {
        const draw = k < drawCount;
        const f = mode !== 'starlink' && fibre ? fibre.route(src, tgt) : null;
        const s = sp ? sp.net.route(geo[src], geo[tgt], (i) => sp.linked.has(i)) : null;
        if (f && s) {
          n++;
          fSum += f.ms;
          sSum += s.ms;
          fMax = Math.max(fMax, f.ms);
          sMax = Math.max(sMax, s.ms);
          if (s.ms < f.ms) wins++;
          if (f.cables.length && !lastCables.length) lastCables = f.cables;
        }
        if (!draw) return;
        if (f) {
          const key = `${src}:${tgt}`;
          let path = fibrePaths.current.get(key);
          if (!path) {
            const pts = surfacePolyline(f.points, LIFT);
            path = { pts, cum: cumulative(pts) };
            if (fibrePaths.current.size > 4000) fibrePaths.current.clear();
            fibrePaths.current.set(key, path);
          }
          const out = (f.ms / 1000) * netMode.get().slowMo;
          addPacket(path, t0, f.ms, FIBRE, false);
          addPacket(reversed(path.pts), t0 + out, f.ms, FIBRE, true);
          flash(path.pts[path.pts.length - 1], t0 + out, FIBRE, 20);
        }
        if (s) {
          const pts = s.points.map((p, i) => (i === 0 || i === s.points.length - 1 ? p.clone().multiplyScalar(LIFT) : p));
          const path = { pts, cum: cumulative(pts) };
          const out = (s.ms / 1000) * netMode.get().slowMo;
          addPacket(path, t0, s.ms, SPACE, false);
          addPacket(reversed(pts), t0 + out, s.ms, SPACE, true);
          flash(pts[pts.length - 1], t0 + out, SPACE, 20);
        }
      });
      flash(geo[src] ? surfacePolyline([geo[src]], LIFT)[0] : new THREE.Vector3(), t0, new THREE.Color(0xffffff), 30);

      if (n > 0) {
        const prev = netMode.get().stats;
        const stats: RaceStats = {
          targets: n,
          fibreAvgMs: fSum / n,
          fibreMaxMs: fMax,
          spaceAvgMs: sSum / n,
          spaceMaxMs: sMax,
          spaceWinShare: wins / n,
          races: (prev?.races ?? 0) + n,
          spaceWins: (prev?.spaceWins ?? 0) + wins,
          lastCables
        };
        netMode.set({ stats });
      }
    });
  }, [geo, index]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const t = now();
    let seg = 0;
    let h = 0;
    const list = packets.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const total = p.cum[p.cum.length - 1];
      const progress = (t - p.t0) / p.dur; // 0..1 while the head travels
      if (progress > 1 && (progress - 1) * total >= p.trail) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      if (progress < 0) continue;
      const head = Math.min(progress, 1) * total;
      const tail = Math.max(progress * total - p.trail, 0);
      if (progress <= 1 && h < MAX_PACKETS) {
        pointAt(p.pts, p.cum, head, tmp).toArray(headPos, h * 3);
        headCol[h * 3] = p.color.r * p.gain;
        headCol[h * 3 + 1] = p.color.g * p.gain;
        headCol[h * 3 + 2] = p.color.b * p.gain;
        headSize[h++] = p.size;
      }
      // Trail: tail → interior vertices → head, brightening toward the head.
      const span = Math.max(head - tail, 1e-6);
      let prevD = tail;
      pointAt(p.pts, p.cum, tail, tmp);
      let px = tmp.x, py = tmp.y, pz = tmp.z;
      for (let k = firstAfter(p.cum, tail); seg < MAX_SEGMENTS; k++) {
        const d = k < p.pts.length && p.cum[k] < head ? p.cum[k] : head;
        if (d === head) pointAt(p.pts, p.cum, head, tmp);
        else tmp.copy(p.pts[k]);
        const a0 = ((prevD - tail) / span) ** 1.5 * p.gain * 1.4;
        const a1 = ((d - tail) / span) ** 1.5 * p.gain * 1.4;
        trailPos.set([px, py, pz, tmp.x, tmp.y, tmp.z], seg * 6);
        trailCol.set([p.color.r * a0, p.color.g * a0, p.color.b * a0, p.color.r * a1, p.color.g * a1, p.color.b * a1], seg * 6);
        seg++;
        px = tmp.x; py = tmp.y; pz = tmp.z;
        prevD = d;
        if (d === head) break;
      }
    }
    const fl = flashes.current;
    for (let i = fl.length - 1; i >= 0; i--) {
      const f = fl[i];
      const age = (t - f.t0) / 0.6;
      if (age > 1) {
        fl[i] = fl[fl.length - 1];
        fl.pop();
        continue;
      }
      if (age < 0 || h >= MAX_PACKETS + MAX_FLASHES) continue;
      f.p.toArray(headPos, h * 3);
      const a = 1 - age;
      headCol[h * 3] = f.color.r * a;
      headCol[h * 3 + 1] = f.color.g * a;
      headCol[h * 3 + 2] = f.color.b * a;
      headSize[h++] = f.size * (0.6 + age);
    }

    const tg = trails.geometry;
    tg.setDrawRange(0, seg * 2);
    for (const name of ['position', 'color']) {
      const a = tg.getAttribute(name) as THREE.BufferAttribute;
      a.clearUpdateRanges();
      a.addUpdateRange(0, seg * 6);
      a.needsUpdate = true;
    }
    const hg = heads.geometry;
    hg.setDrawRange(0, h);
    for (const name of ['position', 'aColor', 'aSize']) {
      const a = hg.getAttribute(name) as THREE.BufferAttribute;
      a.clearUpdateRanges();
      a.addUpdateRange(0, h * a.itemSize);
      a.needsUpdate = true;
    }
    headMat.uniforms.uDpr.value = state.viewport.dpr;
  });

  return (
    <>
      <primitive object={trails} />
      <primitive object={heads} />
    </>
  );
};
