import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { local, yawFor } from '@/lib/sites/frame';
import { siteMaterials } from '@/lib/models/site-materials';
import { CHOPSTICKS2, DECK_M, PAD1, SQD_ARM2, TOWER1, TOWER1_STUBS, TOWER2, TOWER2_BASE, type EN, type Tower } from '@/lib/sites/starbase';

// Starbase's two launch towers, built in code, in metres, in the site frame
// (X east, Y up, Z south; origin the Pad 2 mount centre at the drawn ground;
// docs/starbase-plan.md §A4).
//
// Published (lib/sites/starbase.ts):
// - Tower 2: footprint 11.7 × 11.6 m at 33°, centred (−2.6, 31.0); 145.1 m in
//   total (TOWER2.source: 'OSM; height FAA 2025-ASW-13942-OE (476 ft)').
// - Tower 2 base: 17.4 × 17.2 × 10.5 m at 32° ('OSM way 1304017043').
// - Chopsticks: hinge (−0.3, 21.7), arms 3.9 m wide, 25.9 m hinge to tip,
//   inner faces 11.9 m apart ('OSM (as drawn)').
// - Tower 1: footprint 12.3 × 12.9 m at 36°, centred (330.9, −70.8); 140.2 m of
//   structure ('OSM; height FAA 2024-ASW-5880-OE (460 ft); its mast reportedly
//   removed 2026-09-01'), so no mast here.
// Estimates (not published): the lattice's bay spacing and member sizes, the
// roof box's height, the rails' and carriages' sizes and offsets, the
// chopsticks' 3 m depth, 60 m parked height and 20° opening (CHOPSTICKS2, L),
// everything about the SQD arm (SQD_ARM2: face, height, length, retracted
// pose), Tower 1's stub length and height (TOWER1_STUBS, L), and where its
// stub hinges sit.
//
// Draw calls: everything merges into one lattice mesh and one stainless mesh.

/** Lattice bay spacing (m), estimate. */
export const BAY_M = 9;
/** Member sizes (m), estimates. */
export const COLUMN_M = 1.0;
export const GIRT_M = 0.5;
export const BRACE_M = 0.35;
/** Tower 2's reinforced roof box, within the 145.1 m (estimate; the split between lattice and roof is unknown). */
export const ROOF2_M = 6;
/** The SQD arm's height (centre, m): deck + booster 72.3 m + 2 m (plan §A4, estimate). */
export const SQD_HEIGHT_M = DECK_M + 72.3 + 2;
/** The SQD's hinge pin section (m) and how far its retracted pose is swung out from the SE face (°), estimates. */
const SQD_PIN_M = 1.2;
const SQD_SWING_DEG = 40;
/** Tower 2's base walls stand this far outside the lattice's SW and SE faces (m), an adjustment, not OSM. */
const BASE_CLEAR_M = 0.3;
/** Carriage rails: section and offset of their centre outside the face (m), estimates. */
const RAIL_M = 0.6;
const RAIL_OUT_M = 0.8;
/** Rails sit this far either side of the face's centre (m), estimate. */
const RAIL_SPREAD_M = 2.5;
/** The carriage: its ring's offset outside the footprint, its height and beam size (m), estimates. */
const CARRIAGE_OUT_M = 1.6;
const CARRIAGE_H_M = 6;
const CARRIAGE_BEAM_M = 0.8;
/** How far the chopsticks' hinge line sits from the mount corner, toward the mount (m): Tower 2 measures 1.4 m (OSM), reused for Tower 1 (estimate). */
const HINGE_AHEAD_M = 1.4;

const DEG = Math.PI / 180;
const Y = new THREE.Vector3(0, 1, 0);
const Zv = new THREE.Vector3(0, 0, 1);

/** A box member between two points, `w` across (horizontal side) and `h` across (the other side). */
function beam(a: THREE.Vector3, b: THREE.Vector3, w: number, h = w) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const g = new THREE.BoxGeometry(w, h, len).toNonIndexed();
  g.deleteAttribute('uv');
  const q = new THREE.Quaternion();
  const dir = d.normalize();
  if (Math.abs(dir.y) > 0.999) {
    // Vertical: turn Z up, keep the section square to X.
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), dir.y > 0 ? -Math.PI / 2 : Math.PI / 2);
  } else {
    // Heading about Y first, then pitch, so the section stays level.
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = Math.asin(THREE.MathUtils.clamp(-dir.y, -1, 1));
    q.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  }
  const m = new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  return g.applyMatrix4(m);
}

/** An axis-aligned solid box (centre, size), then moved by `m`. */
function block(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, m?: THREE.Matrix4) {
  const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(cx, cy, cz);
  return m ? g.applyMatrix4(m) : g;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** Site-frame point from (E, N) and height. */
const at3 = (en: EN, y: number) => {
  const [x, z] = local(en[0], en[1]);
  return v(x, y, z);
};
/** Horizontal unit vector (E, N) for a bearing. */
const dirEN = (bearing: number): EN => [Math.sin(bearing * DEG), Math.cos(bearing * DEG)];

export interface LatticeSpec {
  /** Side lengths (m): the first along tower-local X, the second along Z. */
  sides: [number, number];
  /** Height of the lattice's top (m). */
  height: number;
  /** Target bay spacing (m); bays are made equal. */
  bay?: number;
  column?: number;
  girt?: number;
  brace?: number;
}

/**
 * A lattice tower's members in tower-local metres: X along the first side,
 * Z along the second, Y up, centred on the footprint, from y = 0 to `height`.
 * Four corner columns (their outer faces on the footprint), a ring of girts at
 * every bay, and X-bracing on all four faces in every bay. Nothing pokes below
 * 0 or above `height`.
 */
export function latticeParts(spec: LatticeSpec): THREE.BufferGeometry[] {
  const { sides, height, bay = BAY_M, column = COLUMN_M, girt = GIRT_M, brace = BRACE_M } = spec;
  const hx = sides[0] / 2 - column / 2;
  const hz = sides[1] / 2 - column / 2;
  const corners = [v(-hx, 0, -hz), v(hx, 0, -hz), v(hx, 0, hz), v(-hx, 0, hz)];
  const bays = Math.max(1, Math.round(height / bay));
  const parts: THREE.BufferGeometry[] = [];
  for (const c of corners) parts.push(beam(v(c.x, 0, c.z), v(c.x, height, c.z), column));
  // Girt levels: at the bottom and top they sit inside the column's span.
  const levels = Array.from({ length: bays + 1 }, (_, i) => THREE.MathUtils.clamp((height * i) / bays, girt / 2, height - girt / 2));
  for (const y of levels) {
    for (let k = 0; k < 4; k++) {
      const a = corners[k], b = corners[(k + 1) % 4];
      parts.push(beam(v(a.x, y, a.z), v(b.x, y, b.z), girt));
    }
  }
  for (let i = 0; i < bays; i++) {
    const y0 = levels[i], y1 = levels[i + 1];
    for (let k = 0; k < 4; k++) {
      const a = corners[k], b = corners[(k + 1) % 4];
      parts.push(beam(v(a.x, y0, a.z), v(b.x, y1, b.z), brace));
      parts.push(beam(v(b.x, y0, b.z), v(a.x, y1, a.z), brace));
    }
  }
  return parts;
}

/** Tower-local → site frame: local +X to the tower's `bearing`, +Z to bearing + 90°, origin at its centre. */
export function towerMatrix(t: Pick<Tower, 'at' | 'bearing'>) {
  const [x, z] = local(t.at[0], t.at[1]);
  return new THREE.Matrix4().makeRotationY(yawFor(t.bearing)).setPosition(x, 0, z);
}

/** The footprint's four corners (E, N), in the order (−x,−z) (x,−z) (x,z) (−x,z) of tower-local axes. */
export function towerCorners(t: Pick<Tower, 'at' | 'bearing' | 'sides'>): EN[] {
  const u = dirEN(t.bearing), w = dirEN(t.bearing + 90);
  const a = t.sides[0] / 2, b = t.sides[1] / 2;
  return ([[-a, -b], [a, -b], [a, b], [-a, b]] as EN[]).map(([s, r]) => [t.at[0] + s * u[0] + r * w[0], t.at[1] + s * u[1] + r * w[1]]);
}

/** Index of the footprint corner nearest the table's `mountCorner`, and how far off it is (m). */
export function mountCornerIndex(t: Tower) {
  const cs = towerCorners(t);
  let best = 0, err = Infinity;
  cs.forEach((c, i) => {
    const d = Math.hypot(c[0] - t.mountCorner[0], c[1] - t.mountCorner[1]);
    if (d < err) [best, err] = [i, d];
  });
  return { index: best, errorM: err };
}

/**
 * Carriage rails: two vertical rails on each of the two faces that meet at
 * the mount corner, from the ground to `top` (tower-local). Sizes estimated.
 */
function rails(t: Tower, top: number) {
  const { index } = mountCornerIndex(t);
  const hx = t.sides[0] / 2, hz = t.sides[1] / 2;
  const sx = index === 1 || index === 2 ? 1 : -1;
  const sz = index === 2 || index === 3 ? 1 : -1;
  const parts: THREE.BufferGeometry[] = [];
  for (const s of [-RAIL_SPREAD_M, RAIL_SPREAD_M]) {
    // Face x = sx·hx (normal ±X) and face z = sz·hz (normal ±Z).
    parts.push(block(sx * (hx + RAIL_OUT_M), top / 2, s, RAIL_M, top, RAIL_M));
    parts.push(block(s, top / 2, sz * (hz + RAIL_OUT_M), RAIL_M, top, RAIL_M));
  }
  return parts.map((g) => g.applyMatrix4(towerMatrix(t)));
}

/**
 * A box truss from `root` along the horizontal `dir`: four chords, frames at
 * every panel point, and diagonals on all four faces. `width` across
 * (horizontal), `depth` vertical, both centred on `root`'s height.
 */
export function trussParts(root: THREE.Vector3, dir: THREE.Vector3, length: number, width: number, depth: number, chord = 0.5, web = 0.25, panel = 3.2) {
  const u = dir.clone().setY(0).normalize();
  const w = new THREE.Vector3().crossVectors(u, Y).normalize();
  const hw = width / 2 - chord / 2, hd = depth / 2 - chord / 2;
  const n = Math.max(1, Math.round(length / panel));
  const corner = (s: number, k: number) => {
    const sw = k === 0 || k === 3 ? -hw : hw;
    const sd = k < 2 ? -hd : hd;
    return root.clone().addScaledVector(u, s).addScaledVector(w, sw).addScaledVector(Y, sd);
  };
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) parts.push(beam(corner(0, k), corner(length, k), chord));
  for (let i = 0; i <= n; i++) {
    // Panel points stay inside the chords' length.
    const s = THREE.MathUtils.clamp((length * i) / n, web / 2, length - web / 2);
    for (let k = 0; k < 4; k++) parts.push(beam(corner(s, k), corner(s, (k + 1) % 4), web));
  }
  for (let i = 0; i < n; i++) {
    const s0 = THREE.MathUtils.clamp((length * i) / n, web / 2, length - web / 2);
    const s1 = THREE.MathUtils.clamp((length * (i + 1)) / n, web / 2, length - web / 2);
    for (let k = 0; k < 4; k++) parts.push(beam(corner(s0, k), corner(s1, (k + 1) % 4), web));
  }
  return parts;
}

/**
 * A carriage: a ring of beams round the tower at two levels, plus a yoke out
 * to the two hinges, with stainless hinge blocks. All sizes estimated.
 */
function carriage(t: Tower, hinges: EN[], y: number) {
  const lattice: THREE.BufferGeometry[] = [];
  const stainless: THREE.BufferGeometry[] = [];
  const grown = towerCorners({ ...t, sides: [t.sides[0] + 2 * CARRIAGE_OUT_M, t.sides[1] + 2 * CARRIAGE_OUT_M] });
  const { index } = mountCornerIndex(t);
  const y0 = y - CARRIAGE_H_M / 2 + CARRIAGE_BEAM_M / 2, y1 = y + CARRIAGE_H_M / 2 - CARRIAGE_BEAM_M / 2;
  for (const yy of [y0, y1]) {
    for (let k = 0; k < 4; k++) lattice.push(beam(at3(grown[k], yy), at3(grown[(k + 1) % 4], yy), CARRIAGE_BEAM_M));
    lattice.push(beam(at3(hinges[0], yy), at3(hinges[1], yy), CARRIAGE_BEAM_M));
    for (const h of hinges) {
      // To the mount corner and to whichever neighbouring corner is nearer this hinge.
      const nb = [grown[(index + 1) % 4], grown[(index + 3) % 4]];
      const near = nb.reduce((p, c) => (Math.hypot(c[0] - h[0], c[1] - h[1]) < Math.hypot(p[0] - h[0], p[1] - h[1]) ? c : p));
      lattice.push(beam(at3(h, yy), at3(grown[index], yy), CARRIAGE_BEAM_M));
      lattice.push(beam(at3(h, yy), at3(near, yy), CARRIAGE_BEAM_M));
    }
  }
  for (const c of grown) lattice.push(beam(at3(c, y0), at3(c, y1), CARRIAGE_BEAM_M));
  for (const h of hinges) {
    const p = at3(h, y);
    stainless.push(block(p.x, p.y, p.z, 1.6, CARRIAGE_H_M, 1.6));
  }
  return { lattice, stainless };
}

/** Two hinges either side of a hinge centre, across `towardBearing`, so the arms' inner faces are `gap` apart. */
function hingePair(centre: EN, towardBearing: number, gap: number, armWidth: number): EN[] {
  const w = dirEN(towardBearing + 90);
  const off = gap / 2 + armWidth / 2;
  return [-1, 1].map((s) => [centre[0] + s * off * w[0], centre[1] + s * off * w[1]] as EN);
}

const bearingOf = (from: EN, to: EN) => (Math.atan2(to[0] - from[0], to[1] - from[1]) / DEG + 360) % 360;

export interface TowerParts {
  lattice: THREE.BufferGeometry[];
  stainless: THREE.BufferGeometry[];
  /** Named pieces (each one of the geometries above, merged), for checks. */
  named: Record<'tower2' | 'tower2Roof' | 'tower2Base' | 'chopstickWest' | 'chopstickEast' | 'carriage2' | 'sqdArm' | 'tower1' | 'stubA' | 'stubB' | 'carriage1', THREE.BufferGeometry>;
  hinges2: EN[];
  hinges1: EN[];
}

const merged = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts);

/** Every piece of both towers, in the site frame, before merging by material. */
export function buildTowerParts(): TowerParts {
  // ── Tower 2 ──
  const t2 = TOWER2;
  const m2 = towerMatrix(t2);
  const lattice2Top = t2.height - ROOF2_M;
  const hz = t2.sides[1] / 2, hx = t2.sides[0] / 2;
  const tower2 = [...latticeParts({ sides: t2.sides, height: lattice2Top }).map((g) => g.applyMatrix4(m2)), ...rails(t2, lattice2Top)];
  // The roof box: the lattice's footprint, from the lattice's top to 145.1 m (FAA).
  const roof2 = block(0, lattice2Top + ROOF2_M / 2, 0, t2.sides[0], ROOF2_M, t2.sides[1], m2);
  // The base: on the north side (OSM's 17.4 × 17.2 m). OSM draws it at 32°, and its
  // SW and SE sides run along the lattice's SW and SE faces, so drawn as is the
  // walls cross the columns at 1° and z-fight on the faces the launch camera sees.
  // Adjustment (within OSM's 1-3 m): square it to the tower's 33° and slide it
  // (about 0.4 m) so those two walls stand BASE_CLEAR_M outside the columns.
  const [bcx, bcz] = (() => {
    const [x, z] = local(TOWER2_BASE.at[0], TOWER2_BASE.at[1]);
    const p = v(x, 0, z).applyMatrix4(m2.clone().invert());
    return [p.x, p.z];
  })();
  const bx = Math.min(bcx, -hx - BASE_CLEAR_M + TOWER2_BASE.length / 2);
  const bz = Math.max(bcz, hz - TOWER2_BASE.width / 2 + BASE_CLEAR_M);
  const base2 = block(bx, TOWER2_BASE.height / 2, bz, TOWER2_BASE.length, TOWER2_BASE.height, TOWER2_BASE.width, m2);

  // Chopsticks: hinged either side of CHOPSTICKS2.hinge, reaching toward the mount, parked open.
  const C = CHOPSTICKS2;
  const toward2 = bearingOf(C.hinge, [0, 0]);
  const hinges2 = hingePair(C.hinge, toward2, C.innerGap, C.armWidth);
  // hingePair gives the hinge on the left of the reach first (for a south reach, east); each arm opens away from the other.
  const arm = (h: EN, side: -1 | 1) => {
    const d = dirEN(toward2 + side * C.parkedOpen);
    return trussParts(at3(h, C.parkedHeight), v(d[0], 0, -d[1]), C.armLength, C.armWidth, C.armDepth);
  };
  const [armA, armB] = [arm(hinges2[0], -1), arm(hinges2[1], 1)];
  const [armEast, armWest] = hinges2[0][0] > hinges2[1][0] ? [armA, armB] : [armB, armA];
  const car2 = carriage(t2, hinges2, C.parkedHeight);

  // SQD arm (all estimate): on the SE face (+Z tower-local, bearing 33° + 90°), hung
  // on the mount-corner column (−x, +z): a stainless hinge pin against the column's
  // outer face, two bracket beams into the column, and the 20 m truss (SQD_ARM2)
  // swung back toward the far corner but SQD_SWING_DEG out from the face, so it
  // clears the carriage rails. The retracted pose is an estimate.
  const colX = -hx + COLUMN_M / 2, colZ = hz - COLUMN_M / 2;
  const pin = v(colX, SQD_HEIGHT_M, hz + SQD_PIN_M / 2 - 0.05); // overlaps the column 5 cm: no coplanar faces
  const swing = SQD_SWING_DEG * DEG;
  const sqdDir = v(Math.cos(swing), 0, Math.sin(swing));
  const sqd = [
    ...trussParts(pin, sqdDir, SQD_ARM2.length, 2.0, 2.5, 0.35, 0.2, 2.5),
    ...[-1.6, 1.6].map((dy) => beam(v(colX, SQD_HEIGHT_M + dy, colZ), v(pin.x, SQD_HEIGHT_M + dy, pin.z + SQD_PIN_M / 2), 0.5))
  ].map((g) => g.applyMatrix4(m2));
  const endAt = pin.clone().addScaledVector(sqdDir, SQD_ARM2.length - 1.5);
  const sqdEnd = block(0, 0, 0, 3, 3, 3.4, new THREE.Matrix4().makeRotationY(-swing).setPosition(endAt)).applyMatrix4(m2);
  const sqdPin = block(pin.x, pin.y, pin.z, SQD_PIN_M, 4, SQD_PIN_M, m2);

  // ── Tower 1 ──
  const t1 = TOWER1;
  const m1 = towerMatrix(t1);
  const tower1 = [...latticeParts({ sides: t1.sides, height: t1.height }).map((g) => g.applyMatrix4(m1)), ...rails(t1, t1.height)];
  // Stubs: hinged ahead of the mount corner toward the Pad 1 mount, straight (cut, not parked open).
  const toward1 = bearingOf(t1.mountCorner, PAD1.mount);
  const u1 = dirEN(toward1);
  const hingeCentre1: EN = [t1.mountCorner[0] + HINGE_AHEAD_M * u1[0], t1.mountCorner[1] + HINGE_AHEAD_M * u1[1]];
  const hinges1 = hingePair(hingeCentre1, toward1, C.innerGap, C.armWidth);
  const stub = (h: EN) => trussParts(at3(h, TOWER1_STUBS.height), v(u1[0], 0, -u1[1]), TOWER1_STUBS.length, C.armWidth, C.armDepth);
  const [stubA, stubB] = [stub(hinges1[0]), stub(hinges1[1])];
  const car1 = carriage(t1, hinges1, TOWER1_STUBS.height);

  const lattice = [...tower2, ...armA, ...armB, ...car2.lattice, ...sqd, ...tower1, ...stubA, ...stubB, ...car1.lattice];
  const stainless = [roof2, base2, ...car2.stainless, sqdEnd, sqdPin, ...car1.stainless];
  return {
    lattice,
    stainless,
    named: {
      tower2: merged(tower2),
      tower2Roof: roof2,
      tower2Base: base2,
      chopstickWest: merged(armWest),
      chopstickEast: merged(armEast),
      carriage2: merged([...car2.lattice, ...car2.stainless]),
      sqdArm: merged([...sqd, sqdEnd, sqdPin]),
      tower1: merged(tower1),
      stubA: merged(stubA),
      stubB: merged(stubB),
      carriage1: merged([...car1.lattice, ...car1.stainless])
    },
    hinges2,
    hinges1
  };
}

const triangles = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;

/** Tower 2 (with its base, chopsticks, carriage and SQD arm) and Tower 1 (with its stubs), as one group of two meshes. */
export function buildTowers(): THREE.Group {
  const parts = buildTowerParts();
  const mats = siteMaterials();
  const group = new THREE.Group();
  group.name = 'starbase-towers';
  const latticeGeo = merged(parts.lattice);
  const stainlessGeo = merged(parts.stainless);
  for (const [name, geo, mat] of [
    ['towers-lattice', latticeGeo, mats.lattice],
    ['towers-stainless', stainlessGeo, mats.stainless]
  ] as const) {
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    group.add(mesh);
  }
  const top = (g: THREE.BufferGeometry) => (g.computeBoundingBox(), g.boundingBox!.max.y);
  const mid = (g: THREE.BufferGeometry) => (g.computeBoundingBox(), (g.boundingBox!.min.y + g.boundingBox!.max.y) / 2);
  const n = parts.named;
  const c2 = local(TOWER2.at[0], TOWER2.at[1]);
  group.userData.check = {
    tower2TopM: +Math.max(top(n.tower2), top(n.tower2Roof)).toFixed(2),
    tower2CentreFromMountM: +Math.hypot(c2[0], c2[1]).toFixed(2),
    tower2MountCornerErrorM: +mountCornerIndex(TOWER2).errorM.toFixed(2),
    tower1TopM: +top(n.tower1).toFixed(2),
    tower1MountCornerErrorM: +mountCornerIndex(TOWER1).errorM.toFixed(2),
    chopsticksCentreYM: +mid(n.chopstickEast).toFixed(2),
    sqdCentreYM: +mid(n.sqdArm).toFixed(2),
    triangles: triangles(latticeGeo) + triangles(stainlessGeo),
    drawCalls: group.children.length
  };
  return group;
}
