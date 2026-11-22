import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials, SOLAR_TILE_M } from '@/lib/models/materials';

// Procedural Starlink satellites, in metres, built in code so they load
// instantly (the old downloaded GLB was 3 MB): a plated body, hinged solar
// arrays in segments on struts, dish antennas on arms, laser terminals and a
// thruster. Dimensions are approximate,
// from public descriptions; SpaceX doesn't publish drawings, and V3 numbers are
// estimates scaled from what SpaceX has said about it (~2 t, much larger arrays).
//
//   V1.0   flat 2.8 × 1.4 m bus, one ~8 × 2.8 m array, no lasers   (~260 kg)
//   V1.5   same, plus laser terminals                              (~300 kg)
//   V2 Mini 4.1 × 2.7 m bus, two ~12.8 × 4.1 m arrays (~30 m span) (~800 kg)
//   V3     ~7 × 3 m bus, two ~22 × 6 m arrays (~50 m span)         (~2 t, estimate)
//
// Local frame: +X along the arrays, +Y away from Earth (zenith), -Y the
// phased-array antennas facing down, +Z along the direction of flight.

export type StarlinkVersion = 0 | 1 | 2 | 3;

interface Spec {
  bus: [number, number, number]; // x, y (thickness), z
  wing: [number, number]; // length (x), width (z)
  wings: 1 | 2;
  boom: number;
  lasers: number;
}

const SPECS: Record<StarlinkVersion, Spec> = {
  0: { bus: [2.8, 0.25, 1.4], wing: [8.1, 2.8], wings: 1, boom: 1.0, lasers: 0 },
  1: { bus: [2.8, 0.25, 1.4], wing: [8.1, 2.8], wings: 1, boom: 1.0, lasers: 3 },
  2: { bus: [4.1, 0.35, 2.7], wing: [12.8, 4.1], wings: 2, boom: 2.0, lasers: 3 },
  3: { bus: [7.0, 0.5, 3.0], wing: [22, 6], wings: 2, boom: 3.0, lasers: 4 }
};

export const STARLINK_SPAN_M = (v: StarlinkVersion) => {
  const s = SPECS[v];
  return s.bus[0] / 2 + s.boom + s.wing[0] + (s.wings === 2 ? s.bus[0] / 2 + s.boom + s.wing[0] : s.bus[0] / 2);
};

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** A thin rod from a to b. */
function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(radius, radius, d.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

export function buildStarlink(version: StarlinkVersion): THREE.Group {
  const m = materials();
  const s = SPECS[version];
  const [bx, by, bz] = s.bus;
  const size = bx / 4.1; // details scale with the body
  const plate = [box(bx, by, bz)];
  const trim: THREE.BufferGeometry[] = []; // plain metal: rails, arms, the thruster housing
  const dark = [box(bx * 0.96, 0.02, bz * 0.96, 0, -by / 2 - 0.01, 0)]; // phased arrays underneath
  const cells: THREE.BufferGeometry[] = [];
  const backs: THREE.BufferGeometry[] = [];
  const frames: THREE.BufferGeometry[] = []; // unfold with the arrays
  const dishes: THREE.BufferGeometry[] = [];
  const lasers: THREE.BufferGeometry[] = [];

  // A raised rail round the top of the body.
  const rail = 0.05 * size;
  for (const z of [-1, 1]) trim.push(box(bx, rail, rail, 0, by / 2 + rail / 2, (z * (bz - rail)) / 2));
  for (const x of [-1, 1]) trim.push(box(rail, rail, bz, (x * (bx - rail)) / 2, by / 2 + rail / 2, 0));

  // Solar arrays: hinged segments with a small gap between them, in a thin
  // frame, held off the body by two struts. Edge-on to flight and tilted toward
  // the sun in reality; drawn flat here.
  const [wingLength, wingWidth] = s.wing;
  const segments = Math.max(2, Math.round(wingLength / (wingWidth * 0.7)));
  const gap = 0.07 * size;
  const segment = (wingLength - gap * (segments - 1)) / segments;
  const top = by / 2 + 0.05;
  for (const side of s.wings === 2 ? [1, -1] : [1]) {
    const root = side * (bx / 2 + s.boom);
    for (let k = 0; k < segments; k++) {
      const cx = root + side * (k * (segment + gap) + segment / 2);
      const panel = new THREE.PlaneGeometry(segment, wingWidth).rotateX(-Math.PI / 2).translate(cx, top, 0);
      const uv = panel.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * segment) / SOLAR_TILE_M, (uv.getY(i) * wingWidth) / SOLAR_TILE_M);
      cells.push(panel);
      backs.push(new THREE.PlaneGeometry(segment, wingWidth).rotateX(Math.PI / 2).translate(cx, top - 0.03, 0));
    }
    const mid = root + (side * wingLength) / 2;
    const edge = 0.04 * size;
    for (const z of [-1, 1]) frames.push(box(wingLength, edge, edge, mid, top - 0.015, (z * wingWidth) / 2));
    frames.push(box(edge, edge, wingWidth, root + side * wingLength, top - 0.015, 0));
    const hinge = new THREE.Vector3((side * bx) / 2, 0, 0);
    for (const z of [-1, 1]) frames.push(rod(hinge, new THREE.Vector3(root, top - 0.015, z * wingWidth * 0.42), 0.03 * size));
    frames.push(box(edge, edge, wingWidth, root, top - 0.015, 0));
  }

  // Dish antennas for the links to ground stations, on arms off the corners,
  // facing the Earth: four on the V2 Mini and V3, two on the earlier ones.
  const dish = 0.34 * size;
  const corners = version >= 2 ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[-1, 1], [-1, -1]];
  for (const [x, z] of corners) {
    const at = new THREE.Vector3(x * (bx / 2 - dish), -by / 2 - dish * 0.2, z * (bz / 2 + dish * 1.25));
    trim.push(rod(new THREE.Vector3(at.x, -by / 4, (z * bz) / 2), new THREE.Vector3(at.x, at.y, at.z), 0.035 * size));
    dishes.push(new THREE.SphereGeometry(dish, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI).translate(at.x, at.y, at.z));
    dishes.push(new THREE.CylinderGeometry(dish * 1.05, dish * 1.05, 0.03 * size, 20).translate(at.x, at.y, at.z));
  }

  for (let i = 0; i < s.lasers; i++) {
    const x = (i - (s.lasers - 1) / 2) * (bx / Math.max(1, s.lasers));
    lasers.push(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 12).translate(x, by / 2 + 0.18, bz * 0.35));
  }

  // The ion thruster, at the back.
  trim.push(box(0.5 * size, by * 0.8, 0.3 * size, bx * 0.3, 0, -bz / 2 - 0.15 * size));
  lasers.push(new THREE.CylinderGeometry(0.1 * size, 0.14 * size, 0.2 * size, 12).rotateX(Math.PI / 2).translate(bx * 0.3, 0, -bz / 2 - 0.4 * size));

  const g = new THREE.Group();
  g.name = `starlink-v${version}`;
  const add = (parts: THREE.BufferGeometry[], mat: THREE.Material, part: string) => {
    if (!parts.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(parts), mat);
    mesh.userData.part = part; // lets animations fold/unfold the arrays ('solar')
    g.add(mesh);
  };
  add(plate, m.plate, 'bus');
  add(trim, m.bus, 'bus');
  add(dark, m.busDark, 'antennas');
  add(dishes, m.dish, 'antennas');
  add(cells, m.solar, 'solar');
  add(backs, m.solarBack, 'solar');
  add(frames, m.bus, 'solar');
  add(lasers, m.laser, 'lasers');
  return g;
}
