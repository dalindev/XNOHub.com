import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLUMN_M, buildTowers, buildTowerParts, towerCorners, towerMatrix, latticeParts } from '@/lib/models/starbase-towers';
import { CHOPSTICKS2, PAD1, TOWER1, TOWER2, TOWER2_BASE } from '@/lib/sites/starbase';
import { local } from '@/lib/sites/frame';

const group = buildTowers();
const parts = buildTowerParts();
const meshes = group.children as THREE.Mesh[];
const box = (g: THREE.BufferGeometry) => new THREE.Box3().setFromBufferAttribute(g.getAttribute('position') as THREE.BufferAttribute);
const verts = (g: THREE.BufferGeometry) => {
  const p = g.getAttribute('position');
  return Array.from({ length: p.count }, (_, i) => new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
};
const allVerts = meshes.flatMap((m) => verts(m.geometry));
/** Horizontal distance from a site-frame point to an (E, N) point. */
const hdist = (p: THREE.Vector3, en: [number, number]) => {
  const [x, z] = local(en[0], en[1]);
  return Math.hypot(p.x - x, p.z - z);
};

describe('Starbase towers', () => {
  it('stays within budget: 2 draw calls, at most 60k triangles, clean mergeable geometry', () => {
    expect(meshes.length).toBeLessThanOrEqual(3);
    expect(meshes.map((m) => m.name).sort()).toEqual(['towers-lattice', 'towers-stainless']);
    let tris = 0;
    for (const m of meshes) {
      const g = m.geometry;
      expect(g.getAttribute('position')).toBeTruthy();
      expect(g.getAttribute('normal')).toBeTruthy();
      expect(g.boundingSphere).toBeTruthy();
      for (const a of [g.getAttribute('position'), g.getAttribute('normal')]) {
        for (let i = 0; i < a.array.length; i++) expect(Number.isFinite(a.array[i])).toBe(true);
      }
      tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    }
    expect(tris).toBeLessThanOrEqual(60_000);
    expect(tris).toBeGreaterThan(5_000); // member-level lattice, not boxes
    expect(group.userData.check.triangles).toBe(tris);
    expect(group.userData.check.drawCalls).toBe(meshes.length);
  });

  it("Tower 2 is 145.1 m tall, 31.1 m from the mount at 355°, its mount corner where the table says", () => {
    const near2 = allVerts.filter((p) => hdist(p, TOWER2.at) < 40);
    const top = Math.max(...near2.map((p) => p.y));
    expect(top).toBeGreaterThan(145.0);
    expect(top).toBeLessThan(145.2);
    const b = box(parts.named.tower2);
    const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    // The bounding box of a rotated square is centred on it (rails are symmetric enough: check within 0.5 m).
    const lat = box(buildLatticeOnly(TOWER2));
    const lx = (lat.min.x + lat.max.x) / 2, lz = (lat.min.z + lat.max.z) / 2;
    expect(Math.hypot(lx, lz)).toBeCloseTo(31.1, 0);
    expect(Math.abs(Math.hypot(lx, lz) - 31.1)).toBeLessThan(0.5);
    const bearing = (Math.atan2(lx, -lz) * 180) / Math.PI + 360;
    expect(Math.abs((bearing % 360) - 355)).toBeLessThan(2);
    expect(Math.hypot(cx - lx, cz - lz)).toBeLessThan(1.5);
    // A column's outer corner lies within 1 m of the table's mount corner.
    const d = Math.min(...verts(parts.named.tower2).filter((p) => p.y < 1).map((p) => hdist(p, TOWER2.mountCorner)));
    expect(d).toBeLessThan(1);
  });

  it('Tower 1 is 140.2 m of structure, no mast, its mount corner where the table says', () => {
    const near1 = allVerts.filter((p) => hdist(p, TOWER1.at) < 45);
    const top = Math.max(...near1.map((p) => p.y));
    expect(top).toBeGreaterThan(140.1);
    expect(top).toBeLessThan(140.3);
    const d = Math.min(...verts(parts.named.tower1).filter((p) => p.y < 1).map((p) => hdist(p, TOWER1.mountCorner)));
    expect(d).toBeLessThan(1);
    expect(Math.min(...near1.map((p) => p.y))).toBeGreaterThanOrEqual(-1e-6);
  });

  it('the footprints are the table rectangles (OSM): corners at the side lengths apart', () => {
    for (const t of [TOWER2, TOWER1]) {
      const c = towerCorners(t);
      expect(Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1])).toBeCloseTo(t.sides[0], 5);
      expect(Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1])).toBeCloseTo(t.sides[1], 5);
    }
  });

  it('the chopsticks are parked open at 60 m over the mount, tips within 30 m but clear of the stack', () => {
    const { chopstickEast, chopstickWest } = parts.named;
    for (const g of [chopstickEast, chopstickWest]) {
      const b = box(g);
      expect((b.min.y + b.max.y) / 2).toBeCloseTo(CHOPSTICKS2.parkedHeight, 1);
      expect(b.max.y - b.min.y).toBeCloseTo(CHOPSTICKS2.armDepth, 1);
      const vs = verts(g);
      // Tip: the vertex farthest from the tower side (the hinge line, N 21.7).
      const tipN = Math.min(...vs.map((p) => -p.z));
      expect(tipN).toBeLessThan(0); // reaches past the mount centre
      const tip = vs.reduce((a, p) => (p.z > a.z ? p : a));
      expect(Math.hypot(tip.x, tip.z)).toBeLessThan(30);
      expect(Math.min(...vs.map((p) => Math.hypot(p.x, p.z)))).toBeGreaterThan(5.5);
    }
    // East arm opens east, west arm west; they don't cross.
    expect(box(chopstickEast).min.x).toBeGreaterThan(box(chopstickWest).max.x);
    // Inner faces at the hinges: 11.9 m apart (OSM), and the arms are 25.9 m long.
    const [h0, h1] = parts.hinges2;
    expect(Math.hypot(h1[0] - h0[0], h1[1] - h0[1])).toBeCloseTo(CHOPSTICKS2.innerGap + CHOPSTICKS2.armWidth, 5);
    for (const g of [chopstickEast, chopstickWest]) {
      const vs = verts(g);
      const len = Math.max(...vs.map((p) => Math.min(...parts.hinges2.map((h) => hdist(p, h)))));
      expect(len).toBeGreaterThan(CHOPSTICKS2.armLength - 0.5);
      expect(len).toBeLessThan(CHOPSTICKS2.armLength + 2.5);
    }
  });

  it('nothing intrudes into the stack: no vertex within 4.6 m of the mount axis between 18 and 143 m', () => {
    const bad = allVerts.filter((p) => p.y > 18 && p.y < 143 && Math.hypot(p.x, p.z) < 4.6);
    expect(bad).toHaveLength(0);
  });

  it("Tower 1's stubs are 18 m long at 70 m, pointing at the Pad 1 mount", () => {
    for (const g of [parts.named.stubA, parts.named.stubB]) {
      const b = box(g);
      expect((b.min.y + b.max.y) / 2).toBeCloseTo(70, 1);
      const vs = verts(g);
      const len = Math.max(...vs.map((p) => Math.min(...parts.hinges1.map((h) => hdist(p, h)))));
      expect(len).toBeGreaterThan(17.5);
      expect(len).toBeLessThan(20.5);
      // Tip nearer the Pad 1 mount than the root.
      const far = vs.reduce((a, p) => (hdist(p, PAD1.mount) < hdist(a, PAD1.mount) ? p : a));
      expect(hdist(far, PAD1.mount)).toBeLessThan(Math.min(...parts.hinges1.map((h) => Math.hypot(h[0] - PAD1.mount[0], h[1] - PAD1.mount[1]))));
    }
  });

  it('the SQD arm and roof are where the estimate puts them', () => {
    const s = box(parts.named.sqdArm);
    expect((s.min.y + s.max.y) / 2).toBeCloseTo(18 + 72.3 + 2, 0);
    const r = box(parts.named.tower2Roof);
    expect(r.max.y).toBeCloseTo(145.1, 3);
    const base = box(parts.named.tower2Base);
    expect(base.max.y).toBeCloseTo(10.5, 3);
    expect(base.min.y).toBeCloseTo(0, 3);
  });

  // Tower-2-local axes (X along 33°, Z along 123° = the SE face, origin its centre), and its bare lattice's faces.
  const inv2 = towerMatrix(TOWER2).invert();
  const toLocal2 = (g: THREE.BufferGeometry) => verts(g).map((p) => p.applyMatrix4(inv2));
  const lat2 = new THREE.Box3().setFromPoints(toLocal2(buildLatticeOnly(TOWER2)));

  it("the SQD arm hangs on Tower 2: it touches the mount-corner column and clears the rails", () => {
    const sqd = toLocal2(parts.named.sqdArm);
    // The corner column at (−x, +z) (the mount corner), measured from the lattice's own faces.
    const col = new THREE.Box3(
      new THREE.Vector3(lat2.min.x, 80, lat2.max.z - COLUMN_M),
      new THREE.Vector3(lat2.min.x + COLUMN_M, 105, lat2.max.z)
    );
    expect(Math.min(...sqd.map((p) => col.distanceToPoint(p)))).toBeLessThan(0.5);
    // No SQD vertex inside a carriage rail (tower-2 geometry outside the lattice's box, at the arm's height).
    const railVerts = toLocal2(parts.named.tower2).filter((p) => !lat2.containsPoint(p));
    expect(railVerts.length).toBeGreaterThan(0);
    const rails = new THREE.Box3().setFromPoints(railVerts.filter((p) => p.z > lat2.max.z + 0.1));
    // The SE-face rails are vertical, full height: test the arm's points within their x range at that face.
    const inRails = sqd.filter((p) => p.z > lat2.max.z + 0.1 && p.z < rails.max.z && p.y > 1 && railVerts.some((r) => r.z > lat2.max.z + 0.1 && Math.abs(r.x - p.x) < 0.29 && Math.abs(r.z - p.z) < 0.29));
    expect(inRails).toHaveLength(0);
  });

  it("Tower 2's base walls stand clear of the lattice's SW and SE faces (no z-fighting)", () => {
    const b = toLocal2(parts.named.tower2Base);
    const bb = new THREE.Box3().setFromPoints(b);
    // Square to the tower: every vertex on one of the box's x and z planes.
    for (const p of b) {
      expect(Math.min(Math.abs(p.x - bb.min.x), Math.abs(p.x - bb.max.x))).toBeLessThan(1e-3);
      expect(Math.min(Math.abs(p.z - bb.min.z), Math.abs(p.z - bb.max.z))).toBeLessThan(1e-3);
    }
    // SW wall (−x) and SE wall (+z) at least 0.25 m outside the columns' outer faces.
    expect(lat2.min.x - bb.min.x).toBeGreaterThan(0.25);
    expect(bb.max.z - lat2.max.z).toBeGreaterThan(0.25);
    // Still the OSM size, and within 1 m of the OSM centre.
    expect(bb.max.x - bb.min.x).toBeCloseTo(TOWER2_BASE.length, 3);
    expect(bb.max.z - bb.min.z).toBeCloseTo(TOWER2_BASE.width, 3);
    const c = new THREE.Box3().setFromBufferAttribute(parts.named.tower2Base.getAttribute('position') as THREE.BufferAttribute).getCenter(new THREE.Vector3());
    expect(hdist(c, TOWER2_BASE.at)).toBeLessThan(1);
  });
});

/** Tower 2's bare lattice, placed: for measuring its centre without the rails. */
function buildLatticeOnly(t: typeof TOWER2) {
  const m = towerMatrix(t);
  return mergeGeometries(latticeParts({ sides: t.sides, height: 10 }).map((g) => g.applyMatrix4(m)));
}
