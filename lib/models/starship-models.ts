import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vehicleMaterials, textureSize, metreUVs } from '@/lib/models/vehicle-materials';

// Starship V3 (Block 3) and Super Heavy V3, built in code, in metres, +Y up,
// origin at the bottom of each hull.
//
// Sizes: 9 m across; ship 52.1 m, booster 72.3 m, stack 124.4 m (published).
// Shapes follow photos and SpaceX renders; where nothing is published the
// numbers are estimates (flap and grid fin sizes, the nose profile, the
// payload door's height: made tall enough for a folded Starlink V3 with its
// dishes to pass).
//
// Ship: stainless steel on the leeward side (+Z), black hexagonal heat-shield
//   tiles round the windward side (-Z) and over the nose tip, aero chines
//   along the tile line, two big aft flaps at the sides, two smaller forward
//   flaps moved toward the leeward side (about 140 degrees apart), catch
//   fittings for the tower, 3 sea-level and 3 vacuum Raptors, and the Starlink
//   "PEZ" door: a long slot with rounded ends on the leeward side at the
//   bottom of the payload bay, open into the bay (lib/models/starship-onboard),
//   its door folding up inside.
// Booster: 33 Raptor 3s (3 + 10 + 20) hanging below a flat aft heat shield,
//   with no skirt and no engine shields, soot from the engines, three larger
//   grid fins set lower than before (108, 108 and 144 degrees apart), chines
//   and a cable raceway down the side, and the hot-staging ring built in at
//   the top: vents round a steel shield over the forward dome.

export const R = 4.5;
export const SHIP_HEIGHT_M = 52.1;
export const BOOSTER_HEIGHT_M = 72.3;
/** The booster's hot-staging ring: from this height to its top, vents round it. */
export const HOT_STAGE_RING_Y = 69.8;
const BARREL = 36.4; // top of the ship's cylinder; the nose is above
const NOSE = SHIP_HEIGHT_M - BARREL;
const TILE_TIP = 50.4; // tiles all the way round above this

export const SLOT_Y = 33.6;
export const SLOT_H = 1.15;
export const SLOT_HALF_ANGLE = Math.asin(3.2 / R); // a 6.4 m wide opening

/** The nose's radius at a height above the top of the cylinder: blunt, like the real one. */
export function noseRadius(h: number) {
  const t = THREE.MathUtils.clamp(h / NOSE, 0, 1);
  return R * Math.pow(1 - Math.pow(t, 1.8), 0.6);
}
/** The hull's radius at a height (metres from the bottom). */
export const shipRadius = (y: number) => (y <= BARREL ? R : noseRadius(y - BARREL));

const DEG = Math.PI / 180;
// Where the tiles stop on the leeward side, as an angle from +Z: just past the
// sides along the cylinder, further round on the nose to cover the forward
// flaps' roots.
const TILE_EDGE_BARREL = 84 * DEG;
const TILE_EDGE_NOSE = 62 * DEG;
const AFT_FLAP_AT = 90 * DEG;
const FWD_FLAP_AT = 70 * DEG;

const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map(flat));

/** A surface of revolution through `ys` (heights) round part of the Y axis, its texture in metres. */
function lathe(ys: number[], radius: (y: number) => number, phiStart: number, phiLength: number, size: [number, number], segments = 64) {
  const pts = ys.map((y) => new THREE.Vector2(Math.max(radius(y), 0.001), y));
  const g = new THREE.LatheGeometry(pts, segments, phiStart, phiLength);
  return metreUVs(g, size, phiLength * R);
}

const range = (from: number, to: number, n: number) => Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);

/** Rotate a part built pointing along +X so it points out at `angle` from +Z (toward +X). */
const outward = (g: THREE.BufferGeometry, angle: number) => g.rotateY(angle - Math.PI / 2);

function flipWinding(g: THREE.BufferGeometry) {
  const index = g.getIndex();
  if (index) {
    const a = index.array;
    for (let i = 0; i < a.length; i += 3) [a[i + 1], a[i + 2]] = [a[i + 2], a[i + 1]];
    index.needsUpdate = true;
  }
  return g;
}

/**
 * A flap from its outline (u out from the axis, v up), `depth` thick, at
 * `angle`: heat-shield tiles all over, plus a steel skin on its leeward face.
 */
function flap(outline: [number, number][], depth: number, angle: number, tiles: THREE.BufferGeometry[], steel: THREE.BufferGeometry[], edges: THREE.BufferGeometry[]) {
  const shape = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(u, v)));
  const body = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
  metreUVs(body, textureSize('tiles'));
  tiles.push(outward(body.translate(0, 0, -depth / 2), angle));
  // The skin goes on whichever face points toward +Z once turned.
  const skin = metreUVs(new THREE.ShapeGeometry(shape), textureSize('steel'));
  if (Math.sin(angle) > 0) skin.translate(0, 0, depth / 2 + 0.056);
  else flipWinding(skin.scale(1, 1, -1).translate(0, 0, -depth / 2 - 0.056));
  steel.push(outward(skin, angle));
  // The hinge fairing along the root.
  const root = outline.filter(([u]) => u < R);
  const curve = new THREE.CatmullRomCurve3(root.map(([u, v]) => new THREE.Vector3(u + 0.15, v, 0)));
  edges.push(outward(new THREE.TubeGeometry(curve, 24, 0.32, 8, false), angle));
}

/** One engine: its nozzle exit's centre (metres, in the vehicle's frame), exit radius, bell length and ring. */
export interface EngineSlot {
  x: number;
  z: number;
  exitY: number;
  exitR: number;
  bell: number;
  /** Super Heavy: 0 centre, 1 middle, 2 outer. Starship: 0 sea-level, 1 vacuum. */
  ring: number;
}

function engineRing(count: number, radius: number, rot: number, exitY: number, exitR: number, bellLength: number, ring: number): EngineSlot[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + rot;
    return { x: Math.sin(a) * radius, z: Math.cos(a) * radius, exitY, exitR, bell: bellLength, ring };
  });
}

// Super Heavy V3's 33 Raptor 3s hang below its base: V3 has no aft skirt and
// no engine shields, and the engines reach about 3 m below the booster
// (Musk). The inner 13 have 1.30 m exits and 1.53 m bells (the FAA's figures);
// the outer 20 are a little smaller (1.19 m, 1.40 m), as twenty of them fit
// inside the hull's line on photos from below. Rings 0.82, 2.30 and 3.90 m
// from the axis: the ratios measured on such a photo, the size our fit.
export const BOOSTER_EXIT_Y = -3.0;
export const BOOSTER_ENGINES: EngineSlot[] = [
  ...engineRing(3, 0.82, 0, BOOSTER_EXIT_Y, 0.65, 1.53, 0),
  ...engineRing(10, 2.3, 0.2, BOOSTER_EXIT_Y, 0.65, 1.53, 1),
  ...engineRing(20, 3.9, 0.1, BOOSTER_EXIT_Y, 0.595, 1.4, 2)
];
// Starship: 3 sea-level Raptors in the middle, 3 vacuum ones round them,
// inside its 2 m skirt (the vacuum bells' size is our estimate).
export const SHIP_ENGINES: EngineSlot[] = [
  ...engineRing(3, 1.25, 0, 0.4, 0.65, 1.53, 0),
  ...engineRing(3, 3.05, Math.PI / 3, 0.05, 1.2, 3.1, 1)
];

const THROAT_R = 0.111; // Raptor's throat, 0.222 m across (FAA)
const BAND = 0.22; // the bright metal band round the top of the bell, as a share of its length

/**
 * A Raptor's bell, the throat at y = 0 and the exit `length` below: a
 * parabolic bell flaring out at 32 degrees and ending at 6, the usual shape
 * for an area ratio of 34 (the FAA's figure for Raptor). `from` and `to` pick
 * a stretch of it (0 the throat, 1 the exit). The points run up the bell, so
 * a lathe of them faces outward.
 */
function bellProfile(exitR: number, length: number, from = 0, to = 1, steps = 12) {
  const tn = Math.tan(32 * DEG), te = Math.tan(6 * DEG);
  const cy = (exitR - length * te - THROAT_R) / (tn - te); // where the two tangents meet
  const c = new THREE.Vector2(THROAT_R + cy * tn, -cy);
  const a = new THREE.Vector2(THROAT_R, 0), b = new THREE.Vector2(exitR, -length);
  return range(from, to, steps)
    .map((t) => new THREE.Vector2((1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y))
    .reverse();
}

// Above the throat: the combustion chamber, then the powerhead (pumps,
// preburners, manifolds) widening toward the top. Heights as shares of the
// engine above its bell; our estimate from photos of Raptor 3.
const HEAD: [number, number][] = [[THROAT_R, 0], [0.2, 0.05], [0.2, 0.28], [0.29, 0.38], [0.36, 0.55], [0.42, 0.82], [0.4, 1]];
const ENGINE_LENGTH = 3.0; // exit to top, about 3.1 m on Raptor 3

/** The name of each vehicle's mesh of engine-bell insides (it carries aEngine and aDepth, for their glow). */
export const ENGINE_INSIDES = 'engine-insides';

interface EngineParts {
  bells: THREE.BufferGeometry[];
  bands: THREE.BufferGeometry[];
  insides: THREE.BufferGeometry[];
  heads: THREE.BufferGeometry[];
}

/**
 * One Raptor: matte bell with a bright band at its top, its inside (drawn
 * from inside; it glows when the engine burns, so it carries which engine it
 * is and how deep each point is: 0 at the exit, 1 at the throat), and the
 * chamber and powerhead above it with a loop of pipe round each side.
 */
function raptor(e: EngineSlot, index: number, parts: EngineParts, headTop: number) {
  const throatY = e.exitY + e.bell;
  const at = (g: THREE.BufferGeometry) => g.translate(e.x, throatY, e.z);
  parts.bands.push(at(new THREE.LatheGeometry(bellProfile(e.exitR, e.bell, 0, BAND, 3), 28)));
  parts.bells.push(at(new THREE.LatheGeometry(bellProfile(e.exitR, e.bell, BAND, 1, 10), 28)));
  const inside = new THREE.LatheGeometry(bellProfile(e.exitR - 0.012, e.bell - 0.005, 0, 1, 12), 28);
  const pos = inside.getAttribute('position') as THREE.BufferAttribute;
  const depth = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) depth[i] = 1 + pos.getY(i) / e.bell;
  inside.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
  inside.setAttribute('aEngine', new THREE.BufferAttribute(new Float32Array(pos.count).fill(index), 1));
  parts.insides.push(at(inside));
  const height = headTop - throatY;
  if (height <= 0.05) return;
  parts.heads.push(at(new THREE.LatheGeometry(HEAD.map(([r, y]) => new THREE.Vector2(r, y * height)), 14)));
  for (const turn of [0.4, 2.5]) {
    const a = Math.atan2(e.x, e.z) + turn + index;
    const loop = new THREE.CatmullRomCurve3(
      [[0.18, 0.2], [0.46, 0.38], [0.5, 0.7], [0.36, 0.92]].map(([r, y]) => new THREE.Vector3(Math.sin(a) * r, y * height, Math.cos(a) * r))
    );
    parts.heads.push(at(new THREE.TubeGeometry(loop, 10, 0.055, 6, false)));
  }
}

export interface ShipParts {
  group: THREE.Group;
  /** The payload door, hinged at its top edge: scale.y 1 shut, near 0 folded up into the bay. */
  door: THREE.Object3D;
  /** Where satellites leave the ship: the middle of the slot on the hull, ship coordinates (metres). */
  slotPosition: THREE.Vector3;
}

export function buildStarship(): ShipParts {
  const m = vehicleMaterials();
  const steelSize = textureSize('steel');
  const tileSize = textureSize('tiles');
  const steel: THREE.BufferGeometry[] = [];
  const tiles: THREE.BufferGeometry[] = [];
  const edges: THREE.BufferGeometry[] = []; // plain dark: fairings, chines
  const engines: EngineParts = { bells: [], bands: [], insides: [], heads: [] };
  const voids: THREE.BufferGeometry[] = [];

  // Hull: steel leeward, tiles windward, tiles over the tip.
  const nose = range(BARREL, TILE_TIP, 14);
  // The steel side, with the payload slot cut out of it: below and above the
  // slot all the way across, and either side of it at its height.
  const slotLo = SLOT_Y - SLOT_H / 2, slotHi = SLOT_Y + SLOT_H / 2;
  steel.push(lathe([0, slotLo], shipRadius, -TILE_EDGE_BARREL, 2 * TILE_EDGE_BARREL, steelSize, 48));
  steel.push(lathe([slotHi, BARREL], shipRadius, -TILE_EDGE_BARREL, 2 * TILE_EDGE_BARREL, steelSize, 48));
  for (const [from, to] of [[-TILE_EDGE_BARREL, -SLOT_HALF_ANGLE], [SLOT_HALF_ANGLE, TILE_EDGE_BARREL]]) {
    const side = lathe([slotLo, slotHi], shipRadius, from, to - from, steelSize, 14);
    // Keep the steel's texture lined up with the rest of the side.
    const uv = side.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) + ((from + TILE_EDGE_BARREL) * R) / steelSize[0]);
    steel.push(side);
  }
  tiles.push(lathe([0, BARREL], shipRadius, TILE_EDGE_BARREL, Math.PI * 2 - 2 * TILE_EDGE_BARREL, tileSize, 72));
  steel.push(lathe(nose, shipRadius, -TILE_EDGE_NOSE, 2 * TILE_EDGE_NOSE, steelSize, 40));
  tiles.push(lathe(nose, shipRadius, TILE_EDGE_NOSE, Math.PI * 2 - 2 * TILE_EDGE_NOSE, tileSize, 72));
  tiles.push(lathe(range(TILE_TIP, SHIP_HEIGHT_M, 10), shipRadius, 0, Math.PI * 2, tileSize, 72));

  // Aft flaps: a long root on the hull, swept leading edge, square tip.
  for (const side of [1, -1]) {
    flap([[R - 0.15, 0.6], [R + 3.8, 1.4], [R + 3.8, 7.2], [R - 0.15, 12.4]], 0.38, side * AFT_FLAP_AT, tiles, steel, edges);
  }
  // Forward flaps: smaller, on the nose, swept back along its curve.
  const top = 46.8, bottom = 37.4;
  const root = range(top, bottom, 8).map((v) => [shipRadius(v) - 0.15, v] as [number, number]);
  for (const side of [1, -1]) {
    flap([...root, [R + 2.4, 38.0], [R + 2.25, 41.8]], 0.3, side * FWD_FLAP_AT, tiles, steel, edges);
  }
  // Chines along the tile line between the flaps, and the tower's catch fittings.
  for (const side of [1, -1]) {
    edges.push(outward(new THREE.BoxGeometry(0.55, BARREL - 12.4, 0.2).translate(R + 0.2, (BARREL + 12.4) / 2, 0), side * AFT_FLAP_AT));
    steel.push(outward(metreUVs(new THREE.BoxGeometry(0.55, 0.5, 0.8).translate(R + 0.22, BARREL + 0.6, 0), steelSize), side * AFT_FLAP_AT));
  }
  // Small thruster pods below the payload bay.
  for (const a of [35, -35, 145, -145]) {
    steel.push(outward(metreUVs(new THREE.BoxGeometry(0.22, 0.4, 0.4).translate(R + 0.08, 30.6, 0), steelSize), a * DEG));
  }

  // The payload slot: an opening into the bay, framed by a steel lip with rounded ends.
  const s = SLOT_HALF_ANGLE;
  for (const dy of [1, -1]) {
    steel.push(metreUVs(new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.1, 40, 1, false, -s - 0.03, 2 * s + 0.06), steelSize, (2 * s + 0.06) * R).translate(0, SLOT_Y + dy * (SLOT_H / 2 + 0.05), 0));
  }
  for (const side of [1, -1]) {
    const end = new THREE.CylinderGeometry(SLOT_H / 2 + 0.1, SLOT_H / 2 + 0.1, 0.1, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2);
    // A half disc standing on the hull at each end, curved side outward.
    steel.push(end.rotateZ(side > 0 ? -Math.PI / 2 : Math.PI / 2).rotateY(side * s).translate(Math.sin(side * s) * (R + 0.02), SLOT_Y, Math.cos(side * s) * (R + 0.02)));
  }

  // Bottom: the engine bay floor, the inside of the skirt, the engines.
  edges.push(new THREE.CircleGeometry(R, 48).rotateX(Math.PI / 2).translate(0, 2.0, 0));
  voids.push(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 2.0, 48, 1, true).translate(0, 1.0, 0));
  SHIP_ENGINES.forEach((e, i) => raptor(e, i, engines, 2.6));

  const group = new THREE.Group();
  group.name = 'starship-v3';
  const add = (parts: THREE.BufferGeometry[], mat: THREE.Material, name = '') => group.add(Object.assign(new THREE.Mesh(merge(parts), mat), { name }));
  add(steel, m.steel);
  add(tiles, m.tiles);
  add(edges, m.tileEdge);
  add(engines.bells, m.bell);
  add(engines.bands, m.bellBand);
  add(engines.insides, m.bellInside, ENGINE_INSIDES);
  add(engines.heads, m.engineBay);
  add(voids, m.void);

  const door = new THREE.Group();
  door.position.set(0, SLOT_Y + SLOT_H / 2, 0);
  const panel = metreUVs(new THREE.CylinderGeometry(R + 0.02, R + 0.02, SLOT_H, 40, 1, true, -s, 2 * s), steelSize, 2 * s * R).translate(0, -SLOT_H / 2, 0);
  door.add(new THREE.Mesh(panel, m.steel));
  group.add(door);

  return { group, door, slotPosition: new THREE.Vector3(0, SLOT_Y, R) };
}

/** Grid fin angles round the booster, from +Z: 108, 108 and 144 degrees apart. */
export const GRID_FIN_ANGLES = [0, 108, 216].map((d) => d * DEG);

export function buildSuperHeavy(): THREE.Group {
  const m = vehicleMaterials();
  const H = BOOSTER_HEIGHT_M;
  const RING = HOT_STAGE_RING_Y;
  const hullSize = textureSize('boosterSteel');
  const steelSize = textureSize('steel');
  const hull: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const fins: THREE.BufferGeometry[] = [];
  const lattice: THREE.BufferGeometry[] = [];
  const vents: THREE.BufferGeometry[] = [];
  const engines: EngineParts = { bells: [], bands: [], insides: [], heads: [] };
  const plate: THREE.BufferGeometry[] = [];
  const voids: THREE.BufferGeometry[] = [];

  hull.push(metreUVs(new THREE.CylinderGeometry(R, R, RING, 96, 1, true).translate(0, RING / 2, 0), hullSize, Math.PI * 2 * R));

  // Hot-staging ring: vents round the top, a dark gap behind them, a steel
  // shield over the forward dome, a lip at the top.
  vents.push(metreUVs(new THREE.CylinderGeometry(R, R, H - RING, 96, 1, true).translate(0, (RING + H) / 2, 0), textureSize('vents'), Math.PI * 2 * R, RING));
  voids.push(new THREE.CylinderGeometry(R - 0.3, R - 0.3, H - RING, 48, 1, true).translate(0, (RING + H) / 2, 0));
  steel.push(metreUVs(new THREE.SphereGeometry(R - 0.32, 48, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.34, 1).translate(0, RING, 0), steelSize));
  steel.push(new THREE.TorusGeometry(R, 0.09, 6, 96).rotateX(Math.PI / 2).translate(0, H, 0));
  steel.push(new THREE.TorusGeometry(R + 0.02, 0.07, 6, 96).rotateX(Math.PI / 2).translate(0, RING, 0));

  // Grid fins: waffle panels sticking straight out, lattice facing up and
  // down, on an actuator housing.
  const FIN_Y = 64.2, OUT = 3.6, WIDE = 6.0, THICK = 0.9, LAT: [number, number] = [4, 2];
  for (const a of GRID_FIN_ANGLES) {
    const x0 = R + 0.35;
    for (const dy of [THICK / 2, -THICK / 2]) {
      const p = new THREE.PlaneGeometry(OUT, WIDE).rotateX(-Math.PI / 2);
      const uv = p.getAttribute('uv') as THREE.BufferAttribute;
      const pos = p.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / LAT[0], pos.getZ(i) / LAT[1]);
      lattice.push(outward(p.translate(x0 + OUT / 2, FIN_Y + dy, 0), a));
    }
    fins.push(outward(new THREE.BoxGeometry(OUT, THICK, 0.14).translate(x0 + OUT / 2, FIN_Y, WIDE / 2), a));
    fins.push(outward(new THREE.BoxGeometry(OUT, THICK, 0.14).translate(x0 + OUT / 2, FIN_Y, -WIDE / 2), a));
    fins.push(outward(new THREE.BoxGeometry(0.14, THICK, WIDE).translate(x0 + OUT, FIN_Y, 0), a));
    fins.push(outward(new THREE.BoxGeometry(0.14, THICK, WIDE).translate(x0, FIN_Y, 0), a));
    fins.push(outward(new THREE.BoxGeometry(0.9, 1.6, 1.8).translate(R + 0.1, FIN_Y, 0), a));
  }
  // Chines down both sides, a cable raceway, the catch fittings at the top.
  for (const side of [1, -1]) {
    fins.push(outward(new THREE.BoxGeometry(0.42, 50, 0.18).translate(R + 0.16, 33, 0), side * 90 * DEG));
    steel.push(outward(metreUVs(new THREE.BoxGeometry(1.0, 0.9, 1.3).translate(R + 0.4, 67.6, 0), steelSize), side * 90 * DEG));
  }
  steel.push(outward(metreUVs(new THREE.BoxGeometry(0.32, 64, 0.7).translate(R + 0.12, 36, 0), steelSize), 200 * DEG));

  // Bottom: a flat heat shield of metal tiles closing the aft end, the 33
  // bare Raptor 3s hanging from it, and short covers round the gimbals of
  // the inner 13 (the ones that steer).
  plate.push(new THREE.CircleGeometry(R, 64).rotateX(Math.PI / 2));
  BOOSTER_ENGINES.forEach((e, i) => {
    raptor(e, i, engines, 0);
    if (e.ring < 2) plate.push(new THREE.CylinderGeometry(e.exitR + 0.02, e.exitR + 0.08, 0.6, 20, 1, true).translate(e.x, -0.3, e.z));
  });

  const g = new THREE.Group();
  g.name = 'super-heavy-v3';
  const add = (parts: THREE.BufferGeometry[], mat: THREE.Material, name = '') => g.add(Object.assign(new THREE.Mesh(merge(parts), mat), { name }));
  add(hull, m.boosterSteel);
  add(steel, m.steel);
  add(vents, m.vents);
  add(fins, m.fin);
  add(lattice, m.lattice);
  add(plate, m.aftPlate);
  add(engines.bells, m.bell);
  add(engines.bands, m.bellBand);
  add(engines.insides, m.bellInside, ENGINE_INSIDES);
  add(engines.heads, m.engineBay);
  add(voids, m.void);
  return g;
}
