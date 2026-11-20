import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials } from '@/lib/models/materials';

// Procedural Starship and Super Heavy (Block 3 proportions), in metres, +Y up.
// Approximate: 9 m diameter, ship ~52 m, booster ~72 m, stack ~124 m.
// Ship: steel, black heat-shield tiles on the windward (-Z) half, 2 forward
// and 2 aft flaps, 3 sea-level + 3 vacuum Raptors, and the Starlink
// "PEZ" deploy slot on the leeward side. Booster: 33 Raptors (3/10/20 rings),
// 3 grid fins, vented hot-staging ring on top.

export const SHIP_HEIGHT_M = 52;
export const BOOSTER_HEIGHT_M = 72;
const R = 4.5;

function bell(rTop: number, rExit: number, h: number) {
  return new THREE.CylinderGeometry(rTop, rExit, h, 20, 1, true);
}

export interface ShipParts {
  group: THREE.Group;
  /** The PEZ door, to animate open/closed. Hinge at its top edge. */
  door: THREE.Object3D;
  /** Where deployed satellites leave the ship, local coordinates. */
  slotPosition: THREE.Vector3;
}

export function buildStarship(): ShipParts {
  const m = materials();
  const steel: THREE.BufferGeometry[] = [];
  const tiles: THREE.BufferGeometry[] = [];
  const engines: THREE.BufferGeometry[] = [];

  const bodyH = 36;
  // Two half-cylinders: steel leeward (+Z), tiles windward (-Z).
  steel.push(new THREE.CylinderGeometry(R, R, bodyH, 48, 1, false, -Math.PI / 2, Math.PI).translate(0, bodyH / 2, 0));
  tiles.push(new THREE.CylinderGeometry(R + 0.02, R + 0.02, bodyH, 48, 1, true, Math.PI / 2, Math.PI).translate(0, bodyH / 2, 0));
  // Ogive nose from a lathe profile.
  const noseH = SHIP_HEIGHT_M - bodyH;
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    prof.push(new THREE.Vector2(R * Math.sqrt(1 - t * t * 0.96) * (1 - t * 0.15), t * noseH));
  }
  prof.push(new THREE.Vector2(0, noseH + 0.2));
  steel.push(new THREE.LatheGeometry(prof, 48, -Math.PI / 2, Math.PI).translate(0, bodyH, 0));
  tiles.push(new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p.x + 0.02, p.y)), 48, Math.PI / 2, Math.PI).translate(0, bodyH, 0));
  // Flaps on the ±X sides, tiled on their windward faces.
  const flap = (w: number, h: number, y: number, side: number) =>
    new THREE.BoxGeometry(w, h, 0.4).translate(side * (R + w / 2 - 0.3), y, -1.2);
  tiles.push(flap(3.2, 7, bodyH + 5, 1), flap(3.2, 7, bodyH + 5, -1), flap(4.8, 9.5, 6, 1), flap(4.8, 9.5, 6, -1));
  // Bottom dome + engines.
  steel.push(new THREE.CircleGeometry(R, 48).rotateX(Math.PI / 2));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    engines.push(bell(0.45, 0.65, 1.6).translate(Math.cos(a) * 1.0, -0.8, Math.sin(a) * 1.0)); // sea level
    const b = a + Math.PI / 3;
    engines.push(bell(0.55, 1.15, 2.6).translate(Math.cos(b) * 2.9, -1.3, Math.sin(b) * 2.9)); // vacuum
  }

  const group = new THREE.Group();
  group.name = 'starship';
  group.add(new THREE.Mesh(mergeGeometries(steel), m.steel));
  group.add(new THREE.Mesh(mergeGeometries(tiles), m.tiles));
  group.add(new THREE.Mesh(mergeGeometries(engines), m.engine));

  // PEZ slot: dark opening on the leeward side with a door hinged at the top.
  const slotY = 26, slotH = 4, slotW = 7.5;
  const opening = new THREE.Mesh(new THREE.PlaneGeometry(slotW, slotH), m.busDark);
  opening.position.set(0, slotY, R + 0.03);
  group.add(opening);
  const door = new THREE.Group();
  door.position.set(0, slotY + slotH / 2, R + 0.06);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(slotW, slotH, 0.1).translate(0, -slotH / 2, 0), m.steel);
  door.add(doorPanel);
  group.add(door);

  return { group, door, slotPosition: new THREE.Vector3(0, slotY, R + 1) };
}

export function buildSuperHeavy(): THREE.Group {
  const m = materials();
  const steel: THREE.BufferGeometry[] = [];
  const dark: THREE.BufferGeometry[] = [];
  const engines: THREE.BufferGeometry[] = [];
  const H = BOOSTER_HEIGHT_M;

  steel.push(new THREE.CylinderGeometry(R, R, H - 2, 48).translate(0, (H - 2) / 2, 0));
  // Vented hot-staging ring.
  dark.push(new THREE.CylinderGeometry(R * 0.98, R * 0.98, 2, 48, 1, true).translate(0, H - 1, 0));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    steel.push(new THREE.BoxGeometry(0.35, 2, 0.35).translate(Math.cos(a) * R, H - 1, Math.sin(a) * R));
  }
  steel.push(new THREE.CircleGeometry(R, 48).rotateX(-Math.PI / 2).translate(0, H, 0));
  // Three grid fins near the top.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const fin = new THREE.BoxGeometry(5.5, 3.2, 0.5);
    fin.rotateY(-a).translate(Math.cos(a) * (R + 2.9), H - 6, Math.sin(a) * (R + 2.9));
    dark.push(fin);
  }
  // Soot band and engine skirt.
  dark.push(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 6, 48, 1, true).translate(0, 3, 0));
  steel.push(new THREE.CircleGeometry(R, 48).rotateX(Math.PI / 2));
  const ring = (count: number, radius: number, rot = 0) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rot;
      engines.push(bell(0.4, 0.62, 1.5).translate(Math.cos(a) * radius, -0.75, Math.sin(a) * radius));
    }
  };
  ring(3, 0.9);
  ring(10, 2.4, 0.2);
  ring(20, 3.75, 0.1);

  const g = new THREE.Group();
  g.name = 'super-heavy';
  g.add(new THREE.Mesh(mergeGeometries(steel), m.steel));
  g.add(new THREE.Mesh(mergeGeometries(dark), m.soot));
  g.add(new THREE.Mesh(mergeGeometries(engines), m.engine));
  return g;
}
