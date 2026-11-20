import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials } from '@/lib/models/materials';

// Procedural Starlink satellites, in metres, built from a few boxes so they
// load instantly (the old downloaded GLB was 3 MB). Dimensions are approximate,
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

export function buildStarlink(version: StarlinkVersion): THREE.Group {
  const m = materials();
  const s = SPECS[version];
  const [bx, by, bz] = s.bus;
  const busParts = [box(bx, by, bz)];
  const darkParts = [box(bx * 0.96, 0.02, bz * 0.96, 0, -by / 2 - 0.01, 0)]; // phased arrays underneath
  const solarParts: THREE.BufferGeometry[] = [];
  const laserParts: THREE.BufferGeometry[] = [];

  const sides = s.wings === 2 ? [1, -1] : [1];
  for (const side of sides) {
    const boomStart = (side * bx) / 2;
    busParts.push(box(s.boom, 0.08, 0.08, boomStart + (side * s.boom) / 2, 0, 0));
    const cx = boomStart + side * (s.boom + s.wing[0] / 2);
    // Arrays sit edge-on to flight, tilted toward the sun in reality; drawn flat here.
    const panel = new THREE.PlaneGeometry(s.wing[0], s.wing[1]).rotateX(-Math.PI / 2).translate(cx, by / 2 + 0.05, 0);
    const uv = panel.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s.wing[0] / 1.2, uv.getY(i) * s.wing[1] / 1.2);
    solarParts.push(panel);
  }
  for (let i = 0; i < s.lasers; i++) {
    const x = (i - (s.lasers - 1) / 2) * (bx / Math.max(1, s.lasers));
    laserParts.push(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 12).translate(x, by / 2 + 0.18, bz * 0.35));
  }

  const g = new THREE.Group();
  g.name = `starlink-v${version}`;
  const add = (parts: THREE.BufferGeometry[], mat: THREE.Material, part: string) => {
    if (!parts.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(parts), mat);
    mesh.userData.part = part; // lets animations fold/unfold the arrays
    g.add(mesh);
  };
  add(busParts, m.bus, 'bus');
  add(darkParts, m.busDark, 'antennas');
  add(solarParts, m.solar, 'solar');
  add(laserParts, m.laser, 'lasers');
  return g;
}
