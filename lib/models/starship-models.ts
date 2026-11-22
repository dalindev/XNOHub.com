import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vehicleMaterials, textureSize, metreUVs } from '@/lib/models/vehicle-materials';

// Starship V3 (Block 3) and Super Heavy V3, built in code, in metres, +Y up,
// origin at the bottom of each hull.
//
// Sizes: 9 m across; ship 52.1 m, booster 72.3 m, stack 124.4 m (published).
// Shapes follow photos and SpaceX renders; where nothing is published the
// numbers are estimates (flap and grid fin sizes, the nose profile, the
// payload door's height).
//
// Ship: stainless steel on the leeward side (+Z), black hexagonal heat-shield
//   tiles round the windward side (-Z) and over the nose tip, aero chines
//   along the tile line, two big aft flaps at the sides, two smaller forward
//   flaps moved toward the leeward side (about 140 degrees apart), catch
//   fittings for the tower, 3 sea-level and 3 vacuum Raptors, and the Starlink
//   "PEZ" door: a long slot with rounded ends on the leeward side at the
//   bottom of the payload bay, its door folding up into the bay.
// Booster: 33 Raptor 3s (3 + 10 + 20) with no engine shields, soot from the
//   engines, three larger grid fins set lower than before (108, 108 and 144
//   degrees apart), chines and a cable raceway down the side, and the
//   hot-staging ring built in at the top: vents round a steel shield over the
//   forward dome.

export const R = 4.5;
export const SHIP_HEIGHT_M = 52.1;
export const BOOSTER_HEIGHT_M = 72.3;
const BARREL = 36.4; // top of the ship's cylinder; the nose is above
const NOSE = SHIP_HEIGHT_M - BARREL;
const TILE_TIP = 50.4; // tiles all the way round above this

export const SLOT_Y = 33.6;
export const SLOT_H = 0.62;
export const SLOT_HALF_ANGLE = Math.asin(3.2 / R); // a 6.4 m wide opening

/** The nose's radius at a height above the top of the cylinder: blunt, like the real one. */
export function noseRadius(h: number) {
  const t = THREE.MathUtils.clamp(h / NOSE, 0, 1);
  return R * Math.pow(1 - Math.pow(t, 1.8), 0.6);
}
const shipRadius = (y: number) => (y <= BARREL ? R : noseRadius(y - BARREL));

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

/** A rocket engine's bell, throat at y = 0 and exit `length` below. */
function bell(throat: number, exit: number, length: number) {
  const pts = range(0, 1, 12).map((t) => new THREE.Vector2(throat + (exit - throat) * Math.pow(t, 0.55), -t * length));
  return new THREE.LatheGeometry(pts, 28);
}

/** A Raptor: bell plus the powerhead above it, exit at y = 0. */
function raptor(throat: number, exit: number, length: number, x: number, z: number, exitY: number, bells: THREE.BufferGeometry[], heads: THREE.BufferGeometry[]) {
  bells.push(bell(throat, exit, length).translate(x, exitY + length, z));
  heads.push(new THREE.CylinderGeometry(throat * 1.5, throat * 1.1, 1.1, 12).translate(x, exitY + length + 0.55, z));
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
  const bells: THREE.BufferGeometry[] = [];
  const heads: THREE.BufferGeometry[] = [];
  const voids: THREE.BufferGeometry[] = [];

  // Hull: steel leeward, tiles windward, tiles over the tip.
  const barrel = [0, BARREL];
  const nose = range(BARREL, TILE_TIP, 14);
  steel.push(lathe(barrel, shipRadius, -TILE_EDGE_BARREL, 2 * TILE_EDGE_BARREL, steelSize, 48));
  tiles.push(lathe(barrel, shipRadius, TILE_EDGE_BARREL, Math.PI * 2 - 2 * TILE_EDGE_BARREL, tileSize, 72));
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

  // The payload slot: a dark opening framed by a steel lip with rounded ends.
  const s = SLOT_HALF_ANGLE;
  voids.push(new THREE.CylinderGeometry(R + 0.012, R + 0.012, SLOT_H, 40, 1, true, -s, 2 * s).translate(0, SLOT_Y, 0));
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
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    raptor(0.26, 0.65, 1.6, Math.sin(a) * 1.25, Math.cos(a) * 1.25, 0.4, bells, heads); // sea level
    const b = a + Math.PI / 3;
    raptor(0.3, 1.2, 3.1, Math.sin(b) * 3.05, Math.cos(b) * 3.05, 0.05, bells, heads); // vacuum
  }

  const group = new THREE.Group();
  group.name = 'starship-v3';
  const add = (parts: THREE.BufferGeometry[], mat: THREE.Material) => group.add(new THREE.Mesh(merge(parts), mat));
  add(steel, m.steel);
  add(tiles, m.tiles);
  add(edges, m.tileEdge);
  add(bells, m.bell);
  add(heads, m.engineBay);
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
  const RING = 69.8; // the hot-staging ring above this
  const hullSize = textureSize('boosterSteel');
  const steelSize = textureSize('steel');
  const hull: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const fins: THREE.BufferGeometry[] = [];
  const lattice: THREE.BufferGeometry[] = [];
  const vents: THREE.BufferGeometry[] = [];
  const bells: THREE.BufferGeometry[] = [];
  const heads: THREE.BufferGeometry[] = [];
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

  // Bottom: engine shield floor, skirt inside, 33 bare Raptor 3s.
  fins.push(new THREE.CircleGeometry(R, 48).rotateX(Math.PI / 2).translate(0, 3.1, 0));
  voids.push(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 3.1, 48, 1, true).translate(0, 1.55, 0));
  const ring = (count: number, radius: number, rot: number, exitY: number) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rot;
      raptor(0.26, 0.64, 1.7, Math.sin(a) * radius, Math.cos(a) * radius, exitY, bells, heads);
    }
  };
  ring(3, 1.0, 0, -0.4);
  ring(10, 2.45, 0.2, -0.3);
  ring(20, 3.76, 0.1, 0.1);

  const g = new THREE.Group();
  g.name = 'super-heavy-v3';
  const add = (parts: THREE.BufferGeometry[], mat: THREE.Material) => g.add(new THREE.Mesh(merge(parts), mat));
  add(hull, m.boosterSteel);
  add(steel, m.steel);
  add(vents, m.vents);
  add(fins, m.fin);
  add(lattice, m.lattice);
  add(bells, m.bell);
  add(heads, m.engineBay);
  add(voids, m.void);
  return g;
}
