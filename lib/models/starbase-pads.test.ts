import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildPads, ENGINE_CLEAR_R, TRENCH_FLOOR_Y } from '@/lib/models/starbase-pads';
import { DECK_M, PAD1, TRENCH1, TRENCH2 } from '@/lib/sites/starbase';

const group = buildPads();
const meshes = group.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh);
const mesh = (prefix: string) => {
  const m = meshes.find((o) => o.name.startsWith(prefix));
  if (!m) throw new Error(`no mesh ${prefix}`);
  return m;
};
const points = (m: THREE.Mesh) => {
  const p = m.geometry.attributes.position;
  return Array.from({ length: p.count }, (_, i) => new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
};
const all = meshes.flatMap(points);
const r = (v: THREE.Vector3) => Math.hypot(v.x, v.z);
/** Distinct points, rounded to 1 cm. */
const uniq = (vs: THREE.Vector3[]) => [...new Map(vs.map((v) => [`${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`, v])).values()];
/** Count clusters of points closer than `gap` (single linkage). */
function clusters(vs: THREE.Vector3[], gap: number) {
  const seen = new Set<number>();
  let n = 0;
  for (let i = 0; i < vs.length; i++) {
    if (seen.has(i)) continue;
    n++;
    const stack = [i];
    seen.add(i);
    while (stack.length) {
      const a = vs[stack.pop()!];
      vs.forEach((b, j) => {
        if (!seen.has(j) && a.distanceTo(b) < gap) {
          seen.add(j);
          stack.push(j);
        }
      });
    }
  }
  return n;
}

/** Centre and axis bearing (deg) of the dark floor quad near (e, n). */
function floorQuad(e: number, n: number) {
  const pts = uniq(points(mesh('pads-dark')).filter((v) => Math.abs(v.y - TRENCH_FLOOR_Y) < 1e-4 && Math.hypot(v.x - e, v.z + n) < 60));
  expect(pts).toHaveLength(4);
  const c = pts.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / 4);
  // The longest edge of the rectangle (not the diagonal) is its axis.
  const edges = pts.flatMap((a, i) => pts.slice(i + 1).map((b) => b.clone().sub(a))).sort((a, b) => a.length() - b.length());
  const axis = edges[2]; // 2 short sides, 2 long sides, 2 diagonals
  const bearing = ((Math.atan2(axis.x, -axis.z) * 180) / Math.PI + 360) % 180; // E = x, N = −z
  return { e: c.x, n: -c.z, bearing, length: axis.length(), width: edges[0].length() };
}

describe('Starbase pads', () => {
  it('stands the deck top at DECK_M', () => {
    const plate = points(mesh('pads-stainless')).filter((v) => r(v) < 12);
    expect(Math.max(...plate.map((v) => v.y))).toBeCloseTo(DECK_M, 1);
    expect(Math.abs(Math.max(...plate.map((v) => v.y)) - DECK_M)).toBeLessThan(0.05);
    // The steel deck under it does not poke through.
    const steelDeck = points(mesh('pads-steel')).filter((v) => r(v) < 12 && r(v) > 7.7 && v.y < DECK_M + 0.01);
    expect(Math.max(...steelDeck.map((v) => v.y))).toBeLessThanOrEqual(DECK_M);
    expect(group.userData.check.deckTopM).toBeCloseTo(DECK_M, 2);
  });

  it('keeps the engines’ cylinder clear (nothing inside r < 4.55 m for 14 < y < 18)', () => {
    const inside = all.filter((v) => v.y > 14 && v.y < DECK_M && r(v) < ENGINE_CLEAR_R);
    expect(inside).toHaveLength(0);
    expect(group.userData.check.openingClearRadiusM).toBeGreaterThanOrEqual(ENGINE_CLEAR_R);
    // The opening itself is the published 10.7 m.
    const rim = points(mesh('pads-stainless')).filter((v) => r(v) < 6);
    expect(Math.min(...rim.map(r))).toBeCloseTo(10.7 / 2, 1);
  });

  it('has 20 hold-down clamps whose tips reach about 4.6 m, above the deck', () => {
    const tips = uniq(points(mesh('pads-steel')).filter((v) => r(v) < 4.7 && v.y > 14 && v.y < 25));
    expect(Math.min(...tips.map((v) => v.y))).toBeGreaterThanOrEqual(DECK_M - 1e-6);
    expect(Math.min(...tips.map(r))).toBeGreaterThanOrEqual(4.55);
    expect(clusters(tips, 0.8)).toBe(20);
  });

  it('lays Pad 2’s trench floor on TRENCH2 along 123.2 deg', () => {
    const f = floorQuad(TRENCH2.at[0], TRENCH2.at[1]);
    expect(f.e).toBeCloseTo(TRENCH2.at[0], 2);
    expect(f.n).toBeCloseTo(TRENCH2.at[1], 2);
    expect(Math.abs(f.bearing - (TRENCH2.bearing % 180))).toBeLessThan(0.5);
    expect(f.length).toBeCloseTo(84.2, 2);
    expect(f.width).toBeCloseTo(18.3, 2);
  });

  it('lays Pad 1’s trench floor on TRENCH1 along 39 deg', () => {
    const f = floorQuad(TRENCH1.at[0], TRENCH1.at[1]);
    expect(f.e).toBeCloseTo(TRENCH1.at[0], 2);
    expect(f.n).toBeCloseTo(TRENCH1.at[1], 2);
    expect(Math.abs(f.bearing - TRENCH1.bearing)).toBeLessThan(0.5);
  });

  it('builds Pad 1’s four legs to their height, around its mount', () => {
    const [x, z] = [PAD1.mount[0], -PAD1.mount[1]];
    const near = points(mesh('pads-steel')).filter((v) => Math.hypot(v.x - x, v.z - z) < 15);
    expect(Math.max(...near.map((v) => v.y))).toBeCloseTo(PAD1.legHeight, 3);
    const tops = uniq(near.filter((v) => Math.abs(v.y - PAD1.legHeight) < 1e-4));
    expect(clusters(tops, 4.5)).toBe(4);
    // Centred on the trench axis next to the mount point (2.7 m off it; exact centring is checked below).
    const c = tops.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / tops.length);
    expect(Math.hypot(c.x - x, c.z - z)).toBeLessThan(3);
  });

  it('stands Pad 1’s legs clear of its trench walls, centred on the trench axis', () => {
    const b = (TRENCH1.bearing * Math.PI) / 180;
    const along = new THREE.Vector2(Math.sin(b), Math.cos(b)); // (E, N)
    const acrossOf = (v: THREE.Vector3) => (v.x - TRENCH1.at[0]) * along.y - (-v.z - TRENCH1.at[1]) * along.x;
    const alongOf = (v: THREE.Vector3) => (v.x - TRENCH1.at[0]) * along.x + (-v.z - TRENCH1.at[1]) * along.y;
    // Leg feet: the only steel at y = 0 near the Pad 1 mount (A-frames start at the wall tops).
    const [x, z] = [PAD1.mount[0], -PAD1.mount[1]];
    const legPts = points(mesh('pads-steel')).filter((v) => Math.hypot(v.x - x, v.z - z) < 15 && v.y < 1e-4);
    expect(uniq(legPts)).toHaveLength(16); // 4 legs x 4 foot corners
    const innerFace = TRENCH1.width / 2;
    for (const v of legPts) expect(Math.abs(acrossOf(v))).toBeLessThanOrEqual(innerFace);
    // Symmetric about the axis.
    const acr = legPts.map(acrossOf);
    expect(Math.max(...acr) + Math.min(...acr)).toBeCloseTo(0, 3);
    // Centred along the axis where the mount projects onto it (as the ridge pier is).
    const al = legPts.map(alongOf);
    const mountAlong = (PAD1.mount[0] - TRENCH1.at[0]) * along.x + (PAD1.mount[1] - TRENCH1.at[1]) * along.y;
    expect((Math.max(...al) + Math.min(...al)) / 2).toBeCloseTo(mountAlong, 3);
  });

  it('puts Pad 1’s five A-frames about 8 m high over its trench', () => {
    const [x, z] = [TRENCH1.at[0], -TRENCH1.at[1]];
    const apexes = uniq(points(mesh('pads-steel')).filter((v) => Math.hypot(v.x - x, v.z - z) < 45 && v.y > 7 && v.y < 9));
    expect(clusters(apexes, 3)).toBe(5);
  });

  it('stays within budget, with clean geometry', () => {
    expect(meshes.length).toBeLessThanOrEqual(5);
    const tris = meshes.reduce((s, m) => s + m.geometry.attributes.position.count / 3, 0);
    expect(tris).toBeLessThanOrEqual(30_000);
    expect(group.userData.check.triangles).toBe(tris);
    expect(group.userData.check.drawCalls).toBe(meshes.length);
    for (const m of meshes) {
      const g = m.geometry;
      expect(g.attributes.normal).toBeDefined();
      expect(g.boundingSphere).not.toBeNull();
      expect(Number.isFinite(g.boundingSphere!.radius)).toBe(true);
      const arr = g.attributes.position.array as Float32Array;
      expect(arr.every(Number.isFinite)).toBe(true);
      expect(m.name).toMatch(/^pads-/);
    }
    const box = new THREE.Box3().setFromObject(group);
    expect(box.min.y).toBeCloseTo(-6, 3); // trench walls
  });
});
