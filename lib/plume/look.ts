import * as THREE from 'three';
import { FLAME, unitLuminance } from '@/lib/plume/palette';
import { cellLength, diamondCount } from '@/lib/plume/physics';

// How a merged plume looks (lib/plume/plume-material), by altitude and by how
// many engines burn: its shape, the brightness of each of its parts (in
// sunlit-white units) and their colours. The numbers are keyframes matched to
// launch photos at known heights (docs/flames.md); between them, sizes and
// brightnesses are interpolated on a log scale, colours linearly.
//
// The shape: radius R(z) = r0 + a·z^p at z metres downstream of the exits.

export interface PlumeLook {
  /** 0 nothing burning .. 1 all of this mode's engines. */
  on: number;
  r0: number;
  a: number;
  p: number;
  /** How far it glows (m). */
  length: number;
  /** Length of the bright core (m). */
  coreLength: number;
  /** Where the single engines' jets have merged into one column (m). */
  merge: number;
  /** Shock diamonds: spacing (m), how many, how much brighter a node is, how much the column narrows at one. */
  cell: number;
  nodes: number;
  gain: number;
  neck: number;
  /** Brightness of each part, sunlit-white units. */
  near: number;
  node: number;
  core: number;
  body: number;
  fringe: number;
  tail: number;
  /** Sunlight scattered off frozen exhaust high up, as a share of sunlit white. */
  shell: number;
  /** The orange glow round the engines at liftoff. */
  collar: number;
  /** Unit-luminance colours. */
  colNear: THREE.Color;
  colNode: THREE.Color;
  colCore: THREE.Color;
  colBody: THREE.Color;
  colFringe: THREE.Color;
  colTail: THREE.Color;
  colShell: THREE.Color;
  colCollar: THREE.Color;
  /** Turbulence: how much, eddy size (m), how fast the gas carries it (m/s), engine strands. */
  turbulence: number;
  eddy: number;
  flow: number;
  strands: number;
  /** How soft the edge gets toward the tail, as a share of the radius. */
  softTail: number;
}

const U = (c: THREE.Color) => unitLuminance(c);
const mix = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);

const C = {
  near: U(mix(FLAME.nearRose, FLAME.nearLilac, 0.5)),
  lilac: U(FLAME.nearLilac),
  node: U(FLAME.node),
  core: U(mix(FLAME.core, FLAME.violet, 0.15)),
  coreWhite: U(FLAME.node),
  body: U(mix(FLAME.core, FLAME.gap, 0.5)),
  body10: U(FLAME.body10),
  pink20: U(FLAME.pink20),
  fringe: U(mix(FLAME.fringePeach, FLAME.fringeAmber, 0.6)),
  amber: U(FLAME.fringeAmber),
  orange: U(FLAME.fringeOrange),
  tail: U(mix(FLAME.tailSalmon, FLAME.tailRust, 0.35)),
  salmon: U(FLAME.tailSalmon),
  shell: U(FLAME.condensate),
  collar: U(FLAME.collar),
  warmWhite: U(new THREE.Color(0xf1ece5)),
  landing: U(FLAME.landingV3)
};

type Key = Omit<PlumeLook, 'on' | 'cell' | 'nodes' | 'colNode' | 'colShell' | 'colCollar'> & { h: number };

// Super Heavy on all 33 engines, by altitude (km). Brightnesses from photos:
// T+20–35 s at sunrise, T+39 s at twilight, max-Q in daylight, T+79–89 s.
// `core` is the brightness looking through the axis (the body gives part of
// it); `shell` is sunlight scattered by frozen exhaust, which also hides what
// is behind it (a faint bell: 1.15–1.4x the daytime sky seen side-on).
const ASCENT: Key[] = [
  key(0, [4.5, 0.01, 1, 240, 190, 9], [0.36, 0.14], [1.0, 3.0, 1.9, 0.6, 0.15, 0.1, 0, 0.5], [C.near, C.core, C.body, C.fringe, C.tail], [0.35, 7, 100, 0, 0.5]),
  key(0.5, [4.5, 0.012, 1, 250, 195, 9], [0.36, 0.14], [0.8, 2.0, 1.3, 0.5, 0.15, 0.1, 0, 0.25], [C.near, C.core, C.body, C.fringe, C.tail], [0.35, 7, 100, 0, 0.5]),
  key(2.5, [4.5, 0.02, 1, 280, 200, 7], [0.36, 0.14], [0.3, 0.8, 0.5, 0.3, 0.12, 0.08, 0, 0], [C.lilac, C.core, mix(C.body, C.body10, 0.5), C.amber, C.salmon], [0.35, 9, 100, 0, 0.5]),
  key(4.5, [4.5, 0.05, 0.9, 270, 150, 5], [0.3, 0.12], [0.3, 0.5, 0.35, 0.3, 0.1, 0.08, 0, 0], [C.lilac, C.coreWhite, C.body10, C.amber, C.salmon], [0.3, 10, 100, 0.05, 0.5]),
  key(9, [4.5, 0.24, 0.5, 215, 60, 0], [0, 0], [0.3, 0, 0.5, 0.35, 0.03, 0.1, 0, 0], [C.lilac, C.coreWhite, C.body10, C.amber, C.salmon], [0.2, 12, 80, 0.15, 0.5]),
  key(20, [4.5, 1.8, 0.5, 170, 45, 0], [0, 0], [0, 0, 1.0, 0.2, 0.05, 0.06, 0.01, 0], [C.lilac, C.coreWhite, C.pink20, C.orange, C.salmon], [0.2, 20, 60, 0, 0.5]),
  key(30, [4.5, 4.0, 0.52, 220, 35, 0], [0, 0], [0, 0, 0.8, 0.12, 0, 0.04, 0.02, 0], [C.lilac, C.coreWhite, C.pink20, C.orange, C.salmon], [0.2, 30, 40, 0, 0.5]),
  key(45, [4.5, 9.3, 0.52, 320, 27, 0], [0, 0], [0, 0, 0.6, 0.05, 0, 0, 0.02, 0], [C.lilac, C.warmWhite, C.shell, C.orange, C.salmon], [0.25, 40, 20, 0, 0.5]),
  key(65, [4.5, 9.3, 0.52, 320, 27, 0], [0, 0], [0, 0, 0.5, 0.03, 0, 0, 0.02, 0], [C.lilac, C.warmWhite, C.shell, C.orange, C.salmon], [0.25, 40, 20, 0, 0.5])
];

function key(
  h: number,
  [r0, a, p, length, coreLength, merge]: number[],
  [gain, neck]: number[],
  [near, node, core, body, fringe, tail, shell, collar]: number[],
  [colNear, colCore, colBody, colFringe, colTail]: THREE.Color[],
  [turbulence, eddy, flow, strands, softTail]: number[]
): Key {
  return { h, r0, a, p, length, coreLength, merge, gain, neck, near, node, core, body, fringe, tail, shell, collar, colNear, colCore, colBody, colFringe, colTail, turbulence, eddy, flow, strands, softTail };
}

const EPS = 1e-3;
const logLerp = (x: number, y: number, t: number) => {
  const v = Math.exp(THREE.MathUtils.lerp(Math.log(x + EPS), Math.log(y + EPS), t)) - EPS;
  return v < 1e-6 ? 0 : v;
};
const LOG = ['a', 'length', 'coreLength', 'near', 'node', 'core', 'body', 'fringe', 'tail', 'shell', 'collar', 'eddy', 'flow'] as const;
const LIN = ['r0', 'p', 'merge', 'gain', 'neck', 'turbulence', 'strands', 'softTail'] as const;
const COL = ['colNear', 'colCore', 'colBody', 'colFringe', 'colTail'] as const;

export function newPlumeLook(): PlumeLook {
  const k = ASCENT[0];
  return {
    ...k,
    on: 0,
    cell: 27,
    nodes: 0,
    colNear: k.colNear.clone(),
    colNode: C.node.clone(),
    colCore: k.colCore.clone(),
    colBody: k.colBody.clone(),
    colFringe: k.colFringe.clone(),
    colTail: k.colTail.clone(),
    colShell: C.shell.clone(),
    colCollar: C.collar.clone()
  };
}

function between(keys: Key[], h: number, out: PlumeLook) {
  let i = 0;
  while (i < keys.length - 2 && h > keys[i + 1].h) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const t = THREE.MathUtils.clamp((h - k0.h) / (k1.h - k0.h), 0, 1);
  for (const f of LOG) out[f] = logLerp(k0[f], k1[f], t);
  for (const f of LIN) out[f] = THREE.MathUtils.lerp(k0[f], k1[f], t);
  for (const f of COL) out[f].copy(k0[f]).lerp(k1[f], t);
  return out;
}

/**
 * The radius of the merged plume at the exits with `lit` of Super Heavy's 33
 * burning: the centre 3, the middle 13 or all 33, and in between while a ring
 * lights or goes out (on the pad, the centre 3, then the middle 10, then the outer 20).
 */
const litRadius = (lit: number) =>
  lit <= 3 ? 1.47 : lit <= 13 ? THREE.MathUtils.lerp(1.47, 2.95, (lit - 3) / 10) : THREE.MathUtils.lerp(2.95, 4.5, Math.min(1, (lit - 13) / 20));

/**
 * Super Heavy's plume at `hKm` with `lit` engines burning (fractional while
 * they start or stop). All 33 climbing, or starting on the pad: the ascent
 * keyframes. Fewer, high up (after MECO, the boost-back): a faint bell of
 * sunlit exhaust round a small core. The landing burn: its own.
 */
export function boosterLook(hKm: number, lit: number, landing: boolean, out: PlumeLook) {
  const n = Math.max(lit, 0);
  if (!landing && (n > 13.5 || hKm < 30)) {
    between(ASCENT, hKm, out);
    if (hKm < 1 && n < 33) {
      // Starting on the pad: as wide as the engines lit so far, each as bright as it will be.
      out.r0 = Math.min(out.r0, litRadius(n));
      out.on = Math.min(1, n / 3);
    } else out.on = Math.min(1, n / 33);
  } else if (!landing) {
    // After MECO: the centre 3, then 13 for the boost-back; a faint wide bell,
    // growing smoothly as the middle 10 light (m: 0 for 3 engines, 1 for 13).
    const share = Math.sqrt(Math.min(n, 13) / 33);
    const m = THREE.MathUtils.clamp((n - 3) / 10, 0, 1);
    between(ASCENT, Math.max(hKm, 45), out);
    out.r0 = litRadius(Math.min(n, 13));
    out.a = THREE.MathUtils.lerp(5.2, 7.4, m);
    out.length = THREE.MathUtils.lerp(200, 300, m);
    out.core *= share;
    out.shell = THREE.MathUtils.lerp(0.03, 0.06, m) * share;
    out.body *= share;
    out.on = Math.min(1, n / 3);
  } else {
    // The landing burn: a narrow lavender-white flame, weak diamonds near the ground;
    // 13 engines, then 3 (m: 0 for 3 engines, 1 for 13).
    between(ASCENT, 0, out);
    const share = Math.sqrt(Math.min(n, 13) / 33);
    const m = THREE.MathUtils.clamp((n - 3) / 10, 0, 1);
    out.r0 = litRadius(Math.min(n, 13));
    out.a = 0.04;
    out.p = 1;
    out.length = THREE.MathUtils.lerp(40, 60, m);
    out.coreLength = out.length * 0.7;
    out.merge = 4;
    out.near = 0.6 * share;
    out.node = 0.8 * share;
    out.core = 0.6 * share;
    out.body = 0.1;
    // Orange where the flame meets the ground's dust and steam, growing over the last few hundred metres.
    out.fringe = 0.03 + 0.07 * (1 - THREE.MathUtils.smoothstep(hKm, 0.05, 0.3));
    out.tail = 0.05;
    out.shell = 0;
    out.collar = 0;
    out.gain = 0.2;
    out.colBody.copy(C.landing);
    out.colCore.copy(C.coreWhite);
    out.colFringe.copy(C.orange);
    out.turbulence = 0.45;
    out.on = Math.min(1, n / 3);
  }
  const engines = landing ? THREE.MathUtils.clamp(n, 3, 13) : n > 13.5 ? 33 : n > 3.5 ? 13 : 3;
  out.cell = cellLength(hKm, engines);
  out.nodes = landing ? (hKm < 1 ? 2 * (1 - THREE.MathUtils.smoothstep(hKm, 0.6, 1)) : 0) : n > 13.5 ? diamondCount(hKm) : 0;
  return out;
}

/**
 * Starship's plume: always in near-vacuum, so nothing shows behind its
 * nozzles by day but the faintest sunlit haze (the nozzle glow does the rest).
 */
export function shipLook(hKm: number, lit: number, out: PlumeLook) {
  between(ASCENT, 65, out);
  out.r0 = 4.25;
  out.a = 6.4;
  out.p = 0.52;
  out.length = 400;
  out.core = 0;
  out.body = 0;
  out.shell = 0.005;
  out.nodes = 0;
  out.cell = cellLength(Math.max(hKm, 60), 6);
  out.on = Math.min(1, Math.max(lit, 0) / 6);
  return out;
}
