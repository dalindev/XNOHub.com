import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { siteMaterials, type SiteMaterialName } from '@/lib/models/site-materials';
import { local, yawFor } from '@/lib/sites/frame';
import { APRON1, DECK_M, MOUNT2, PAD1, POND, SERVICE2, TRENCH1, TRENCH2, type Box, type EN } from '@/lib/sites/starbase';

/**
 * Starbase's two pads at true scale (docs/starbase-plan.md §A4): Pad 2's launch
 * mount, service structure and flame trench; Pad 1 mid-rebuild; the pond.
 *
 * Local site frame, metres: X east, Y up, Z south, origin the Pad 2 mount
 * centre on the drawn ground. One merged mesh per material (5 draw calls).
 *
 * Published (positions and footprints, from lib/sites/starbase.ts):
 *  - MOUNT2 outline and its 10.7 m opening ('OSM way 1304017041'); the 18 m deck
 *    height is a placeholder (L).
 *  - SERVICE2 outline ('OSM'); its 12 m height is estimated.
 *  - TRENCH2 84.2 x 18.3 m along 123.2 deg ('OSM way 1352374225'); TRENCH1 84.0 x
 *    18.3 m along 39 deg ('OSM'); APRON1 ('OSM way 759249805'); POND ('OSM').
 *  - Pad 1's parts as of 2026-10-23 (four legs, walls, one ramp, five A-frames,
 *    the ridge-cap support) ('NSF 2026-10-23'); leg height 14 m estimated.
 *  - 20 hold-down clamps, as on LC-39A's V3 mount (M for Pad 2).
 * Every other size below (deck thickness, leg section, clamp and hood shape,
 * plate width, wall thickness and height, bucket and ridge shape, A-frame
 * height, ramp) is an estimate and says so where it is set.
 */

const DEG = Math.PI / 180;

// ── Estimates (not published) ───────────────────────────────────────────
/** Deck: steel box 4 m deep under a 0.3 m water-cooled plate whose top is the deck top (estimates). */
const DECK_THICK_M = 4;
const PLATE_THICK_M = 0.3;
/** The plate ring's outer radius (estimate; the outline's nearest side is 9.2 m from the centre). */
const PLATE_OUTER_M = 8.5;
/** Legs: 3 x 3 m box columns, 7 m along and 6.5 m across the trench axis from the mount centre (inferred from Pad 1's new mount, L). */
const LEG_SIDE_M = 3;
const LEG_ALONG_M = 7;
const LEG_ACROSS_M = 6.5;
/** Clamps: 20 evenly round the opening, jaw tips at r = 4.6 m (count M; shape estimated). */
export const CLAMP_COUNT = 20;
export const CLAMP_TIP_R = 4.6;
const CLAMP_WIDTH_M = 0.9;
/** Booster engine envelope that must stay clear: r < 4.55 m between y = 14 and the deck top. */
export const ENGINE_CLEAR_R = 4.55;
/** Trench walls: 1 m thick, 1.2 m above the ground, down to y = -6 (estimates; the depth is unknown). */
const WALL_THICK_M = 1;
const WALL_TOP_M = 1.2;
const WALL_BOTTOM_M = -6;
/** The trench floor as drawn (the terrain can't be cut yet). */
export const TRENCH_FLOOR_Y = 0.15;
/** Diverter buckets: concave ramps 14 m long each side of a ridge 3 m up; ridge cap 1 m above that (estimates). */
const BUCKET_LEN_M = 14;
const BUCKET_TOP_M = 3;
const RIDGE_CAP_M = 1;
/** Pad 1 A-frames: about 8 m tall, 12 m apart along the trench (estimates). */
const AFRAME_HEIGHT_M = 8;
const AFRAME_SPACING_M = 12;
const AFRAME_MEMBER_M = 0.5;

// ── Geometry helpers ────────────────────────────────────────────────────

/** Non-indexed, position + normal only, no groups: mergeable with everything else. */
function clean(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) if (name !== 'position' && name !== 'normal') out.deleteAttribute(name);
  out.clearGroups();
  return out;
}

/** A box centred at (x, y, z), turned by `yaw` about +Y. */
function box(w: number, h: number, d: number, x: number, y: number, z: number, yaw = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (yaw) g.rotateY(yaw);
  return g.translate(x, y, z);
}

/** A beam of square section `s` from a to b. */
function beam(a: THREE.Vector3, b: THREE.Vector3, s: number) {
  const dir = b.clone().sub(a);
  const g = new THREE.BoxGeometry(s, dir.length(), s);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

/** A shape drawn in (E, N), extruded upward from y0 to y1 into the local frame. */
function prismEN(shape: THREE.Shape, y0: number, y1: number, curveSegments = 12) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments });
  // Shape (x = E, y = N), extruded along +Z → rotate so +Z becomes +Y: (E, N, h) → (E, h, −N).
  g.rotateX(-Math.PI / 2);
  return g.translate(0, y0, 0);
}

const shapeEN = (pts: EN[]) => new THREE.Shape(pts.map(([e, n]) => new THREE.Vector2(e, n)));

/** A profile in (u, y), extruded `width` across, centred on the profile plane. */
function profile(pts: [number, number][], width: number) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(u, y))), { depth: width, bevelEnabled: false });
  return g.translate(0, 0, -width / 2);
}

/** Place geometry built in a trench's own frame (X along its bearing, Z across) at `at` (E, N). */
function toSite(g: THREE.BufferGeometry, bearing: number, at: EN) {
  const [x, z] = local(at[0], at[1]);
  return g.rotateY(yawFor(bearing)).translate(x, 0, z);
}

/** Position of `p` (E, N) along a trench's axis from its centre (m). */
function alongAxis(t: Box, p: EN) {
  const b = t.bearing * DEG;
  return (p[0] - t.at[0]) * Math.sin(b) + (p[1] - t.at[1]) * Math.cos(b);
}

type Parts = Record<SiteMaterialName, THREE.BufferGeometry[]>;

// ── Trenches ────────────────────────────────────────────────────────────

/** Floor (dark quad) and two long walls, ends left open, in the trench's own frame. */
function trenchShell(t: Box, parts: Parts) {
  const floor = new THREE.PlaneGeometry(t.length, t.width).rotateX(-Math.PI / 2).translate(0, TRENCH_FLOOR_Y, 0);
  parts.dark.push(toSite(floor, t.bearing, t.at));
  const wallH = WALL_TOP_M - WALL_BOTTOM_M;
  for (const side of [-1, 1]) {
    const off = side * (t.width / 2 + WALL_THICK_M / 2);
    parts.concrete.push(toSite(box(t.length, wallH, WALL_THICK_M, 0, WALL_BOTTOM_M + wallH / 2, off), t.bearing, t.at));
  }
}

/** The ridge cap: a wedge whose crest runs across the trench, splitting the flow both ways along it (shape estimated). */
function ridgeCap(base: number, u: number, width: number) {
  return profile([[u - 1.2, base], [u + 1.2, base], [u, base + RIDGE_CAP_M]], width);
}

/** Two concave diverter buckets falling from the ridge to the floor, either side of `u` (shape estimated). */
function buckets(u: number, width: number) {
  const out: THREE.BufferGeometry[] = [];
  const bottom = TRENCH_FLOOR_Y + 0.05; // just above the floor quad
  for (const s of [1, -1]) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      pts.push([u + s * f * BUCKET_LEN_M, bottom + (BUCKET_TOP_M - bottom) * (1 - f) ** 2]);
    }
    pts.push([u, bottom]);
    out.push(profile(pts, width));
  }
  return out;
}

function pad2Trench(parts: Parts) {
  const t = TRENCH2;
  trenchShell(t, parts);
  const u = alongAxis(t, [0, 0]); // under the mount centre
  for (const g of buckets(u, t.width)) parts.dark.push(toSite(g, t.bearing, t.at));
  parts.concrete.push(toSite(ridgeCap(BUCKET_TOP_M, u, t.width), t.bearing, t.at));
}

function pad1Trench(parts: Parts) {
  const t = TRENCH1;
  trenchShell(t, parts);
  const u = alongAxis(t, PAD1.mount);
  // Ridge-cap support (no buckets yet): a 3 m pier with the cap wedge on it (estimates).
  parts.concrete.push(toSite(box(2.4, BUCKET_TOP_M, t.width, u, BUCKET_TOP_M / 2, 0), t.bearing, t.at));
  parts.concrete.push(toSite(ridgeCap(BUCKET_TOP_M, u, t.width), t.bearing, t.at));
  // One exit ramp: a 6 m wide wedge against one wall at the 39 deg end (which end and its size estimated).
  const ramp = profile([[t.length / 2 - 16, TRENCH_FLOOR_Y], [t.length / 2, TRENCH_FLOOR_Y], [t.length / 2, WALL_TOP_M]], 6).translate(0, 0, -t.width / 2 + 3);
  parts.concrete.push(toSite(ramp, t.bearing, t.at));
  // Five A-frames spanning the trench from wall top to wall top (about 8 m tall, estimate).
  const half = t.width / 2 + WALL_THICK_M / 2;
  for (let k = -2; k <= 2; k++) {
    const x = u + k * AFRAME_SPACING_M;
    const l = new THREE.Vector3(x, WALL_TOP_M, -half);
    const r = new THREE.Vector3(x, WALL_TOP_M, half);
    const top = new THREE.Vector3(x, AFRAME_HEIGHT_M, 0);
    const tieY = WALL_TOP_M + (AFRAME_HEIGHT_M - WALL_TOP_M) * 0.4;
    const tieHalf = half * (1 - 0.4);
    for (const g of [beam(l, top, AFRAME_MEMBER_M), beam(r, top, AFRAME_MEMBER_M), beam(new THREE.Vector3(x, tieY, -tieHalf), new THREE.Vector3(x, tieY, tieHalf), AFRAME_MEMBER_M * 0.6)]) {
      parts.lattice.push(toSite(g, t.bearing, t.at));
    }
  }
}

// ── Mounts ──────────────────────────────────────────────────────────────

/** Four box legs at ±along, ±across the trench axis around `at` (offset `u` along it), from the ground to `top`. */
function legs(at: EN, bearing: number, top: number, u = 0) {
  const out: THREE.BufferGeometry[] = [];
  for (const a of [-1, 1]) for (const c of [-1, 1]) {
    out.push(toSite(box(LEG_SIDE_M, top, LEG_SIDE_M, u + a * LEG_ALONG_M, top / 2, c * LEG_ACROSS_M), bearing, at));
  }
  return out;
}

/** A hooded hold-down clamp: jaw tip at r = CLAMP_TIP_R just above the deck, hood rising outward (shape estimated). */
function clamp(angle: number, deckTop: number) {
  const r0 = CLAMP_TIP_R;
  const g = profile(
    [
      [r0, deckTop],
      [r0 + 3.0, deckTop],
      [r0 + 3.0, deckTop + 2.2],
      [r0 + 1.6, deckTop + 2.2],
      [r0 + 0.6, deckTop + 1.2],
      [r0 + 0.6, deckTop + 0.7],
      [r0, deckTop + 0.7]
    ],
    CLAMP_WIDTH_M
  );
  return g.rotateY(angle);
}

function pad2Mount(parts: Parts) {
  const top = DECK_M;
  const plateBottom = top - PLATE_THICK_M;
  const deckBottom = plateBottom - DECK_THICK_M;
  const r = MOUNT2.opening / 2;
  const hole = () => new THREE.Path().absarc(0, 0, r, 0, Math.PI * 2, true);
  // Deck: the six-sided outline with the round opening, under the plate.
  const deck = shapeEN(MOUNT2.corners);
  deck.holes.push(hole());
  parts.lattice.push(prismEN(deck, deckBottom, plateBottom, 48));
  // Water-cooled stainless plate ring round the opening; its top is the deck top.
  const plate = new THREE.Shape().absarc(0, 0, PLATE_OUTER_M, 0, Math.PI * 2, false);
  plate.holes.push(hole());
  parts.stainless.push(prismEN(plate, plateBottom, top, 48));
  parts.lattice.push(...legs([0, 0], TRENCH2.bearing, deckBottom));
  for (let k = 0; k < CLAMP_COUNT; k++) parts.lattice.push(clamp((k / CLAMP_COUNT) * Math.PI * 2, top));
  // Service structure: the polygon at 12 m (height estimated), stainless cladding.
  parts.stainless.push(prismEN(shapeEN(SERVICE2.corners), 0, SERVICE2.height));
}

function pad1(parts: Parts) {
  // The legs straddle the trench, so they sit on its axis (PAD1.mount projected onto it, as the
  // ridge pier and A-frames do). PAD1.mount itself is 2.7 m off that axis, which would put one leg
  // pair half inside a wall; the trench (M) is the better-placed of the two (mount H within ~6 m).
  parts.lattice.push(...legs(TRENCH1.at, TRENCH1.bearing, PAD1.legHeight, alongAxis(TRENCH1, PAD1.mount)));
  pad1Trench(parts);
  // Apron: a 0.1 m slab whose top is at y = 0.1.
  parts.concrete.push(prismEN(shapeEN(APRON1.corners), 0, 0.1));
}

// ── Build ───────────────────────────────────────────────────────────────

const MESH_NAMES: Partial<Record<SiteMaterialName, string>> = {
  lattice: 'pads-steel (mount deck, legs, clamps, Pad 1 legs and A-frames)',
  stainless: 'pads-stainless (deck plate, service structure)',
  concrete: 'pads-concrete (trench walls, ridge caps, Pad 1 ramp and apron)',
  dark: 'pads-dark (trench floors, diverter buckets)',
  water: 'pads-water (pond)'
};

export function buildPads(): THREE.Group {
  const parts: Parts = { lattice: [], stainless: [], paint: [], building: [], concrete: [], dark: [], water: [], gravel: [] };
  pad2Mount(parts);
  pad2Trench(parts);
  pad1(parts);
  // Pond: flat water at y = 0.1.
  parts.water.push(new THREE.ShapeGeometry(shapeEN(POND)).rotateX(-Math.PI / 2).translate(0, 0.1, 0));

  const mats = siteMaterials();
  const group = new THREE.Group();
  group.name = 'starbase-pads';
  let triangles = 0;
  for (const key of Object.keys(parts) as SiteMaterialName[]) {
    if (!parts[key].length) continue;
    const geo = mergeGeometries(parts[key].map(clean));
    if (!geo) throw new Error(`starbase-pads: could not merge ${key}`);
    geo.computeBoundingSphere();
    triangles += geo.attributes.position.count / 3;
    const mesh = new THREE.Mesh(geo, mats[key]);
    mesh.name = MESH_NAMES[key] ?? `pads-${key}`;
    group.add(mesh);
  }

  // Measured facts for the dev hook.
  let deckTop = -Infinity;
  let clearR = Infinity;
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const p = (o.geometry as THREE.BufferGeometry).attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const rr = Math.hypot(x, z);
      if (rr < 12 && y < DECK_M + 0.01 && y > 14) deckTop = Math.max(deckTop, y);
      if (y > 14 && y < DECK_M) clearR = Math.min(clearR, rr);
    }
  });
  group.userData.check = {
    deckTopM: +deckTop.toFixed(3),
    openingClearRadiusM: +clearR.toFixed(3),
    clamps: CLAMP_COUNT,
    trench2BearingDeg: TRENCH2.bearing,
    trench1BearingDeg: TRENCH1.bearing,
    pad1LegHeightM: PAD1.legHeight,
    triangles,
    drawCalls: group.children.length
  };
  return group;
}
