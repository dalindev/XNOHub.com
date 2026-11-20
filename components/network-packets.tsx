'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { RepNode } from '@/types/index';
import { onConfirmation, confirmationsPerSecond } from '@/lib/feed/bus';
import { ArcRing } from '@/lib/arcs/arc-ring';
import { FibreNetwork, type CablesFile, type Route } from '@/lib/routing/fiber';
import { SpaceNetwork, type SpaceRoute } from '@/lib/routing/space';
import { surfacePolyline, cumulative, pointAt, simplify } from '@/lib/routing/polyline';
import { constellation, allSatScene, currentLinks, satScene } from '@/lib/constellation';
import { KM } from '@/lib/geo';
import { simNowMs } from '@/lib/sim-clock';
import { settings } from '@/lib/settings';
import { routeStats, type LegStats } from '@/lib/route-stats';
import { packetClock, pulseNode } from '@/lib/node-pulse';

// Each confirmation, the way Nano really settles it: the block is broadcast
// to every online representative, each one votes, and the votes come back.
// Once votes carrying two-thirds of the online voting weight are back, the
// block is confirmed and the sending node flashes green.
//
// The signal travels the way a signal really would:
//  - amber: along submarine cables and overland fibre, at light speed in glass;
//  - cyan:  up to a Starlink, across the laser links at light speed in
//           vacuum, and back down (a what-if: real nodes are on fibre).
// The light burns along the route like a fuse (bright tip, glowing trail that
// fades), the node pulses when it arrives, and its vote returns as a thinner,
// paler line. Timing is the real propagation delay × settings.slowMo: an
// ocean crossing takes ~40 ms, far too fast to see at 1×.
//
// The newest confirmation is drawn at full brightness; older ones dim as soon
// as a newer one arrives, so one transaction is always easy to follow.
//
// Fibre routes are static, so each is written to the GPU once and animated
// there from a time uniform. Starlink routes ride on moving satellites, so
// those (far fewer) segments are refreshed every frame.

const CAPACITY = 80_000; // fibre segments in the ring
const LIVE_CAPACITY = 40_000; // Starlink segments, rewritten each frame
const MAX_PACKETS = 1_800;
const MAX_POINTS = 2_400; // packet tips + relay flashes
// Packets alive at once before the broadcast is thinned out. Starlink packets
// cost more: their satellites move, so their segments are rebuilt every frame.
const FIBRE_BUDGET = 1_400;
const SPACE_BUDGET = 600;
const MIN_DRAWN = 6; // nodes drawn per confirmation when the network is very busy
const QUORUM = 67; // % of online voting weight that confirms a block
const LIFT = 1.0026; // surface routes float ~16 km up: clear of terrain and the ellipsoid bulge
const SIMPLIFY = 5 * KM;

// Colours as they should appear on screen (the shaders write them as is).
const hex = (v: number) => new THREE.Color().setHex(v, THREE.LinearSRGBColorSpace);
const FIBRE = hex(0xffb347);
const FIBRE_VOTE = hex(0xffe3b0);
const SPACE = hex(0x6fe3ff);
const SPACE_VOTE = hex(0xcdf5ff);
const WHITE = hex(0xffffff);
const CONFIRMED = hex(0x6dffa8);

const ribbonVertex = /* glsl */ `
  uniform vec2 uViewport; // CSS px
  uniform float uNear;
  uniform float uTime;
  uniform vec2 uLatest;   // newest confirmation: id, time it arrived
  attribute float aT;
  attribute float aSide;
  attribute vec3 iA;
  attribute vec3 iB;
  attribute vec4 iTiming; // tip reaches A (s), reaches B (s), fade (s), confirmation id
  attribute vec4 iLook;   // rgb, width (px)
  attribute float iGain;
  varying float vSide;
  varying float vT;
  varying float vFade;
  varying vec3 vColor;
  varying float vGain;

  void main() {
    float first = min(iTiming.x, iTiming.y), last = max(iTiming.x, iTiming.y);
    if (uTime < first || uTime - last > iTiming.z * 5.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // not lit yet, or burnt out
      return;
    }
    vec4 a = modelViewMatrix * vec4(iA, 1.0);
    vec4 b = modelViewMatrix * vec4(iB, 1.0);
    float tA = iTiming.x, tB = iTiming.y;
    // Trim at the near plane: a point behind the camera would flip the ribbon.
    float near = -uNear;
    if (a.z > near && b.z > near) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    if (a.z > near) {
      float k = (near - b.z) / (a.z - b.z);
      a = mix(b, a, k);
      tA = mix(tB, tA, k);
    } else if (b.z > near) {
      float k = (near - a.z) / (b.z - a.z);
      b = mix(a, b, k);
      tB = mix(tA, tB, k);
    }
    vec4 ca = projectionMatrix * a;
    vec4 cb = projectionMatrix * b;
    vec2 halfView = uViewport * 0.5;
    vec2 dir = cb.xy / cb.w * halfView - ca.xy / ca.w * halfView;
    float len = length(dir);
    dir = len > 1e-5 ? dir / len : vec2(1.0, 0.0);
    vec4 clip = mix(ca, cb, aT);
    clip.xy += vec2(-dir.y, dir.x) * aSide * iLook.w * 0.5 / halfView * clip.w;
    gl_Position = clip;

    float conf = iTiming.w;
    float dim = conf >= uLatest.x ? 1.0
              : conf >= uLatest.x - 1.0 ? mix(1.0, 0.36, smoothstep(0.0, 0.7, uTime - uLatest.y))
              : 0.36;
    vSide = aSide;
    vT = mix(tA, tB, aT);
    vFade = iTiming.z;
    vColor = iLook.rgb;
    vGain = iGain * dim;
  }
`;

const ribbonFragment = /* glsl */ `
  uniform float uTime;
  varying float vSide;
  varying float vT;
  varying float vFade;
  varying vec3 vColor;
  varying float vGain;
  void main() {
    float dt = uTime - vT;
    if (dt < 0.0) discard; // ahead of the tip
    float trail = exp(-dt / vFade);
    float tip = exp(-dt / (vFade * 0.12));
    float x = abs(vSide);
    float body = exp(-x * x * 4.5);  // soft glow across the ribbon
    float core = exp(-x * x * 36.0); // thin hot line down the middle
    vec3 col = vColor * body * trail * 0.9 + mix(vColor, vec3(1.0), 0.75) * core * (trail * 0.55 + tip);
    float alpha = clamp(body * trail * 0.5 + core * (trail * 0.5 + tip), 0.0, 1.0);
    if (alpha * vGain < 0.003) discard;
    gl_FragColor = vec4(col * vGain, alpha * vGain); // premultiplied: glows on dark, still reads over cloud
  }
`;

const pointVertex = /* glsl */ `
  uniform float uDpr;
  attribute vec4 aLook; // rgb, strength
  attribute float aSize;
  varying vec4 vLook;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uDpr;
    vLook = aLook;
  }
`;

const pointFragment = /* glsl */ `
  varying vec4 vLook;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.42, d);
    float halo = pow(1.0 - d, 2.2);
    vec3 col = vLook.rgb * halo * 0.8 + mix(vLook.rgb, vec3(1.0), 0.85) * core;
    float alpha = clamp(core + halo * 0.45, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha) * vLook.a;
  }
`;

interface Path {
  pts: THREE.Vector3[];
  cum: Float32Array;
}

interface Look {
  t0: number;
  dur: number;
  fade: number;
  color: THREE.Color;
  width: number;
  gain: number;
  conf: number;
  tipSize: number;
}

interface Packet extends Path, Look {
  /** Starlink only: the satellites between the two ground ends (pts[1..]), in travel order. They keep moving. */
  sats?: number[];
  nextRelay?: number;
}

interface Flash {
  p: THREE.Vector3;
  t0: number;
  color: THREE.Color;
  size: number;
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ribbonGeometry(capacity: number) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 1]), 1));
  geo.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array([-1, 1, -1, 1]), 1));
  geo.setIndex([0, 1, 2, 1, 3, 2]);
  const inst = (size: number) => new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(THREE.DynamicDrawUsage);
  const attrs = { iA: inst(3), iB: inst(3), iTiming: inst(4), iLook: inst(4), iGain: inst(1) };
  Object.entries(attrs).forEach(([k, a]) => geo.setAttribute(k, a));
  // Every slot starts burnt out, so unused ones draw nothing.
  for (let i = 0; i < capacity; i++) attrs.iTiming.array.set([-1e6, -1e6, 1, -1], i * 4);
  geo.instanceCount = 0;
  return { geo, attrs };
}

type RibbonAttrs = ReturnType<typeof ribbonGeometry>['attrs'];

function writeSegment(attrs: RibbonAttrs, slot: number, a: THREE.Vector3, b: THREE.Vector3, tA: number, tB: number, p: Look) {
  const A = attrs.iA.array, B = attrs.iB.array, T = attrs.iTiming.array, L = attrs.iLook.array;
  const i3 = slot * 3, i4 = slot * 4;
  A[i3] = a.x;
  A[i3 + 1] = a.y;
  A[i3 + 2] = a.z;
  B[i3] = b.x;
  B[i3 + 1] = b.y;
  B[i3 + 2] = b.z;
  T[i4] = tA;
  T[i4 + 1] = tB;
  T[i4 + 2] = p.fade;
  T[i4 + 3] = p.conf;
  L[i4] = p.color.r;
  L[i4 + 1] = p.color.g;
  L[i4 + 2] = p.color.b;
  L[i4 + 3] = p.width;
  attrs.iGain.array[slot] = p.gain;
}

interface Props {
  reps: RepNode[];
  cables: CablesFile;
}

export const NetworkPackets: React.FC<Props> = ({ reps, cables }) => {
  const camera = useThree((s) => s.camera);
  const drawn = useMemo(() => reps.filter((r) => r.lat !== null && r.lon !== null), [reps]);
  const index = useMemo(() => new Map(drawn.map((r, i) => [r.account, i])), [drawn]);
  const geo = useMemo(() => drawn.map((r) => ({ lat: r.lat!, lon: r.lon! })), [drawn]);
  // Online nodes, heaviest voters first: their votes are the ones that confirm a block.
  const voters = useMemo(
    () =>
      drawn
        .map((_, i) => i)
        .filter((i) => drawn[i].online)
        .sort((a, b) => drawn[b].weightPercent - drawn[a].weightPercent),
    [drawn]
  );

  const fibreRef = useRef<FibreNetwork | null>(null);
  const spaceRef = useRef<{ net: SpaceNetwork; sim: number; wall: number } | null>(null);
  // Where each satellite is this frame, worked out once however many routes pass through it.
  const satNow = useRef({ frame: 0, stamp: new Int32Array(0), pos: new Float32Array(0) });
  const packets = useRef<Packet[]>([]);
  const flashes = useRef<Flash[]>([]);
  const fibrePaths = useRef(new Map<string, { fwd: Path; rev: Path }>());
  const latest = useRef({ id: 0, at: -1e6 });

  // The fibre graph takes ~100-300 ms to build; do it off the first frame.
  useEffect(() => {
    fibreRef.current = null;
    fibrePaths.current.clear();
    const id = setTimeout(() => {
      fibreRef.current = new FibreNetwork(cables, geo);
    }, 50);
    return () => clearTimeout(id);
  }, [cables, geo]);

  const scene = useMemo(() => {
    const ring = new ArcRing(CAPACITY);
    const fixed = ribbonGeometry(CAPACITY);
    const live = ribbonGeometry(LIVE_CAPACITY);
    const ribbonMat = new THREE.ShaderMaterial({
      vertexShader: ribbonVertex,
      fragmentShader: ribbonFragment,
      uniforms: {
        uViewport: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0.001 },
        uTime: { value: 0 },
        uLatest: { value: new THREE.Vector2(0, -1e6) }
      },
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      side: THREE.DoubleSide // ribbons are built in screen space; their winding follows the segment's direction
    });
    const fixedMesh = new THREE.Mesh(fixed.geo, ribbonMat);
    const liveMesh = new THREE.Mesh(live.geo, ribbonMat);

    const pos = new Float32Array(MAX_POINTS * 3), look = new Float32Array(MAX_POINTS * 4), size = new Float32Array(MAX_POINTS);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('aLook', new THREE.BufferAttribute(look, 4).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    const pointMat = new THREE.ShaderMaterial({
      vertexShader: pointVertex,
      fragmentShader: pointFragment,
      uniforms: { uDpr: { value: 1 } },
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false
    });
    const points = new THREE.Points(pg, pointMat);
    for (const o of [fixedMesh, liveMesh, points]) o.frustumCulled = false;
    fixedMesh.renderOrder = liveMesh.renderOrder = 4;
    points.renderOrder = 5;
    return { ring, fixed, live, ribbonMat, fixedMesh, liveMesh, points, pointMat, pos, look, size };
  }, []);

  useEffect(
    () => () => {
      scene.fixed.geo.dispose();
      scene.live.geo.dispose();
      scene.ribbonMat.dispose();
      scene.points.geometry.dispose();
      scene.pointMat.dispose();
    },
    [scene]
  );

  useEffect(() => {
    const space = () => {
      if (!constellation.rows.length) return null;
      const sim = simNowMs();
      const wall = performance.now();
      const s = spaceRef.current;
      // Satellites move ~7.6 km/s: refresh the routing snapshot every 5 s of sim time.
      if (s && (Math.abs(sim - s.sim) < 5000 || wall - s.wall < 250)) return s;
      spaceRef.current = { net: new SpaceNetwork(allSatScene(), currentLinks(sim)), sim, wall };
      return spaceRef.current;
    };

    const fibrePath = (src: number, tgt: number, route: Route) => {
      const key = `${src}:${tgt}`;
      let path = fibrePaths.current.get(key);
      if (!path) {
        const pts = simplify(surfacePolyline(route.points, LIFT), SIMPLIFY);
        const back = [...pts].reverse();
        path = { fwd: { pts, cum: cumulative(pts) }, rev: { pts: back, cum: cumulative(back) } };
        if (fibrePaths.current.size > 4000) fibrePaths.current.clear();
        fibrePaths.current.set(key, path);
      }
      return path;
    };

    // `crowd` is 0 for a handful of nodes and 1 when 40 or more are drawn:
    // dozens of lines share the same cables then, so each is thinner and softer.
    const look = (t0: number, dur: number, color: THREE.Color, vote: boolean, conf: number, weight: number, crowd: number): Look => ({
      t0,
      dur,
      fade: THREE.MathUtils.clamp(dur * 0.22, 0.25, 0.9),
      color,
      width: (vote ? 5 : 9) * weight * (1 - 0.4 * crowd),
      gain: (vote ? 0.55 : 1) * (1 - 0.4 * crowd),
      conf,
      tipSize: (vote ? 7 : 13) * weight * (1 - 0.3 * crowd)
    });

    const addFibre = (path: Path, l: Look) => {
      if (packets.current.length >= MAX_PACKETS) return;
      const total = path.cum[path.cum.length - 1] || 1;
      for (let k = 0; k + 1 < path.pts.length; k++) {
        const tA = l.t0 + (path.cum[k] / total) * l.dur;
        const tB = l.t0 + (path.cum[k + 1] / total) * l.dur;
        writeSegment(scene.fixed.attrs, scene.ring.claim(), path.pts[k], path.pts[k + 1], tA, tB, l);
      }
      packets.current.push({ ...path, ...l });
    };

    const addSpace = (route: SpaceRoute, reverse: boolean, l: Look) => {
      if (packets.current.length >= MAX_PACKETS) return;
      const sats = reverse ? [...route.sats].reverse() : route.sats;
      const ends = [route.points[0], route.points[route.points.length - 1]].map((g) => g.clone().normalize().multiplyScalar(LIFT));
      if (reverse) ends.reverse();
      const pts = [ends[0], ...sats.map((i) => satScene(i)), ends[1]];
      packets.current.push({ pts, cum: new Float32Array(pts.length), sats, nextRelay: 1, ...l });
    };

    if (process.env.NODE_ENV === 'development') {
      const w = window as unknown as { __xno?: Record<string, unknown> };
      w.__xno = {
        ...(w.__xno ?? {}),
        packets: () => ({ packets: packets.current.length, segments: scene.ring.count, fibreReady: !!fibreRef.current })
      };
    }

    let confSeq = 0;
    return onConfirmation((c, amount) => {
      const { mode, slowMo } = settings.get();
      if (mode === 'classic' || voters.length < 2) return;
      const fibre = mode !== 'starlink' ? fibreRef.current : null;
      const sp = mode !== 'cables' ? space() : null;
      if (!fibre && !sp) return;

      // The block starts at its representative's node (any online node if that one isn't on the map).
      const own = index.get(c.message.block.representative);
      const src = own !== undefined && drawn[own].online ? own : voters[Math.floor(Math.random() * voters.length)];
      const others = voters.filter((i) => i !== src);
      const seconds = (ms: number) => Math.max(0.05, (ms / 1000) * slowMo);

      // Nano sends every block to every representative and each one's vote
      // comes back: all of that is drawn while the network is quiet. A busy
      // network would be a solid sheet of light, so fewer nodes are drawn as
      // the rate climbs (heaviest voters first, then a random few). The
      // timings below always cover every node.
      const cps = Math.max(0.2, confirmationsPerSecond());
      const before = routeStats.get();
      const typicalMs = (fibre ? before?.fibre?.avgMs : before?.space?.avgMs) ?? 30;
      const life = 2 * seconds(typicalMs) + 1.5; // out, back, and the afterglow
      const kinds = fibre && sp ? 2 : 1;
      const budget = (sp ? SPACE_BUDGET : FIBRE_BUDGET) / (cps * life * 2 * kinds);
      const drawCount = THREE.MathUtils.clamp(Math.floor(budget), MIN_DRAWN, others.length);
      const heavy = others.slice(0, Math.ceil(drawCount / 2));
      const targets = drawCount >= others.length ? others : [...heavy, ...shuffle(others.slice(heavy.length))];

      const t0 = packetClock();
      const conf = ++confSeq;
      latest.current = { id: conf, at: t0 };
      const weight = amount >= 1000 ? 1.5 : amount >= 10 ? 1.2 : 1;
      const crowd = THREE.MathUtils.clamp((drawCount - 8) / 32, 0, 1);

      const f = { n: 0, sum: 0, max: 0, trips: [] as [number, number][] };
      const s = { n: 0, sum: 0, max: 0, trips: [] as [number, number][] };
      let pairs = 0, spaceFirst = 0, longestFibre = 0, longestSpace = 0, hops = 0;
      let cablesUsed: string[] = [];
      targets.forEach((tgt, k) => {
        const fr = fibre ? fibre.route(src, tgt) : null;
        const sr = sp ? sp.net.route(geo[src], geo[tgt]) : null;
        const share = drawn[tgt].weightPercent;
        if (fr) {
          f.n++;
          f.sum += fr.ms;
          f.max = Math.max(f.max, fr.ms);
          f.trips.push([fr.ms, share]);
        }
        if (sr) {
          s.n++;
          s.sum += sr.ms;
          s.max = Math.max(s.max, sr.ms);
          s.trips.push([sr.ms, share]);
        }
        if (fr && sr) {
          pairs++;
          if (sr.ms < fr.ms) spaceFirst++;
        }
        if (k >= drawCount) return;
        if (fr) {
          const path = fibrePath(src, tgt, fr);
          const out = seconds(fr.ms);
          addFibre(path.fwd, look(t0, out, FIBRE, false, conf, weight, crowd));
          addFibre(path.rev, look(t0 + out, out, FIBRE_VOTE, true, conf, weight, crowd));
          pulseNode(tgt, t0 + out, FIBRE);
          if (fr.ms > longestFibre && fr.cables.length) {
            longestFibre = fr.ms;
            cablesUsed = fr.cables;
          }
        }
        if (sr) {
          const out = seconds(sr.ms);
          addSpace(sr, false, look(t0, out, SPACE, false, conf, weight, crowd));
          addSpace(sr, true, look(t0 + out, out, SPACE_VOTE, true, conf, weight, crowd));
          pulseNode(tgt, t0 + out, SPACE);
          if (sr.ms > longestSpace) {
            longestSpace = sr.ms;
            hops = sr.sats.length;
          }
        }
      });
      pulseNode(src, t0, WHITE);

      // Confirmed when the votes that are back add up to two-thirds of the
      // online weight. The sender's own vote needs no trip.
      const quorum = (trips: [number, number][]) => {
        let have = drawn[src].weightPercent;
        if (have >= QUORUM) return 0;
        trips.sort((a, b) => a[0] - b[0]);
        for (const [ms, share] of trips) {
          have += share;
          if (have >= QUORUM) return 2 * ms; // there and back
        }
        return null;
      };
      const leg = (x: typeof f): LegStats | null =>
        x.n ? { nodes: x.n, avgMs: x.sum / x.n, maxMs: x.max, quorumMs: quorum(x.trips) } : null;
      const fibreLeg = leg(f), spaceLeg = leg(s);
      const confirmedMs = (fibreLeg ?? spaceLeg)?.quorumMs;
      if (confirmedMs !== null && confirmedMs !== undefined) pulseNode(src, t0 + seconds(confirmedMs), CONFIRMED);

      routeStats.set({
        fibre: fibreLeg,
        space: spaceLeg,
        drawn: Math.min(drawCount, targets.length),
        online: others.length,
        pairs,
        spaceFirst,
        totalPairs: (before?.totalPairs ?? 0) + pairs,
        totalSpaceFirst: (before?.totalSpaceFirst ?? 0) + spaceFirst,
        cables: cablesUsed,
        hops
      });
    });
  }, [geo, index, drawn, voters, scene]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const t = packetClock();
    const { ring, fixed, live, ribbonMat, points, pointMat, pos, look, size } = scene;
    const u = ribbonMat.uniforms;
    u.uTime.value = t;
    u.uViewport.value.set(state.size.width, state.size.height);
    u.uNear.value = (camera as THREE.PerspectiveCamera).near * 1.02;
    u.uLatest.value.set(latest.current.id, latest.current.at);

    const dirty = ring.takeDirty();
    if (dirty) {
      const [offset, count] = dirty;
      for (const a of Object.values(fixed.attrs)) {
        a.clearUpdateRanges();
        a.addUpdateRange(offset * a.itemSize, count * a.itemSize);
        a.needsUpdate = true;
      }
      fixed.geo.instanceCount = ring.count;
    }

    // Each satellite's position is worked out once a frame, however many routes use it.
    const sn = satNow.current;
    const rows = constellation.rows.length;
    if (sn.stamp.length !== rows) {
      sn.stamp = new Int32Array(rows);
      sn.pos = new Float32Array(rows * 3);
    }
    sn.frame++;
    const satAt = (i: number, out: THREE.Vector3) => {
      if (sn.stamp[i] !== sn.frame) {
        satScene(i, out).toArray(sn.pos, i * 3);
        sn.stamp[i] = sn.frame;
        return out;
      }
      return out.fromArray(sn.pos, i * 3);
    };

    let seg = 0, h = 0;
    const dim = (conf: number) =>
      conf >= latest.current.id ? 1 : conf >= latest.current.id - 1 ? 1 - 0.64 * THREE.MathUtils.smoothstep(t - latest.current.at, 0, 0.7) : 0.36;
    const list = packets.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (t > p.t0 + p.dur + p.fade * 5) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      if (p.sats) {
        // Starlink: the satellites have moved; refresh this route's points and timings.
        for (let k = 0; k < p.sats.length; k++) satAt(p.sats[k], p.pts[k + 1]);
        for (let k = 1; k < p.pts.length; k++) p.cum[k] = p.cum[k - 1] + p.pts[k].distanceTo(p.pts[k - 1]);
        const total = p.cum[p.cum.length - 1] || 1;
        if (t >= p.t0) {
          for (let k = 0; k + 1 < p.pts.length && seg < LIVE_CAPACITY; k++) {
            const tA = p.t0 + (p.cum[k] / total) * p.dur;
            const tB = p.t0 + (p.cum[k + 1] / total) * p.dur;
            writeSegment(live.attrs, seg++, p.pts[k], p.pts[k + 1], tA, tB, p);
          }
          // Each satellite flashes as the signal passes through it.
          const tipD = Math.min(1, (t - p.t0) / p.dur) * total;
          while (p.nextRelay! < p.pts.length - 1 && tipD >= p.cum[p.nextRelay!]) {
            if (flashes.current.length < 500) {
              flashes.current.push({ p: p.pts[p.nextRelay!], t0: t, color: p.color, size: p.tipSize * 1.3 * p.gain + 4 });
            }
            p.nextRelay!++;
          }
        }
      }
      // The tip.
      const progress = (t - p.t0) / p.dur;
      if (progress >= 0 && progress <= 1 && h < MAX_POINTS) {
        const total = p.cum[p.cum.length - 1];
        pointAt(p.pts, p.cum, progress * total, tmp).toArray(pos, h * 3);
        look.set([p.color.r, p.color.g, p.color.b, Math.min(1, p.gain * dim(p.conf) * 1.3)], h * 4);
        size[h++] = p.tipSize;
      }
    }
    const fl = flashes.current;
    for (let i = fl.length - 1; i >= 0; i--) {
      const f = fl[i];
      const age = (t - f.t0) / 0.5;
      if (age > 1) {
        fl[i] = fl[fl.length - 1];
        fl.pop();
        continue;
      }
      if (h >= MAX_POINTS) continue;
      f.p.toArray(pos, h * 3);
      look.set([f.color.r, f.color.g, f.color.b, (1 - age) * 0.9], h * 4);
      size[h++] = f.size * (0.7 + 0.6 * age);
    }

    live.geo.instanceCount = seg;
    for (const a of Object.values(live.attrs)) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, seg * a.itemSize);
      a.needsUpdate = seg > 0;
    }
    const pg = points.geometry;
    pg.setDrawRange(0, h);
    for (const name of ['position', 'aLook', 'aSize']) {
      const a = pg.getAttribute(name) as THREE.BufferAttribute;
      a.clearUpdateRanges();
      a.addUpdateRange(0, h * a.itemSize);
      a.needsUpdate = h > 0;
    }
    pointMat.uniforms.uDpr.value = state.viewport.dpr;
  });

  return (
    <>
      <primitive object={scene.fixedMesh} />
      <primitive object={scene.liveMesh} />
      <primitive object={scene.points} />
    </>
  );
};
