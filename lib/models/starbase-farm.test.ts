import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildFarm, SADDLE_M } from '@/lib/models/starbase-farm';
import { BUILDINGS, DELUGE_TANKS, H_TANKS, TANK_BEARING, TANK_SIZE, V_TANKS, VAPORIZERS, type EN } from '@/lib/sites/starbase';

const group = buildFarm();
const meshes: THREE.Mesh[] = [];
group.traverse((o) => {
  if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
});
const byName = (n: string) => meshes.find((m) => m.name === n)!;

interface Range {
  id: string;
  start: number;
  count: number;
}
/** The actual vertices of one named part in a merged mesh. */
function partPoints(mesh: THREE.Mesh, id: string) {
  const r = (mesh.userData.parts as Range[]).find((p) => p.id === id);
  if (!r) throw new Error(`no part ${id} in ${mesh.name}`);
  const pos = mesh.geometry.attributes.position;
  const pts: THREE.Vector3[] = [];
  for (let i = r.start; i < r.start + r.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i));
  return pts;
}
const boxOf = (pts: THREE.Vector3[]) => new THREE.Box3().setFromPoints(pts);
/** Bearing (0–180°) of the horizontal principal axis of a point set. */
function axisBearing(pts: THREE.Vector3[]) {
  const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(pts.length);
  let xx = 0, xz = 0, zz = 0;
  for (const p of pts) {
    const dx = p.x - c.x, dz = p.z - c.z;
    xx += dx * dx; xz += dx * dz; zz += dz * dz;
  }
  const theta = 0.5 * Math.atan2(2 * xz, xx - zz); // principal direction angle from +X towards +Z
  const dx = Math.cos(theta), dz = Math.sin(theta);
  const b = (Math.atan2(dx, -dz) * 180) / Math.PI;
  return ((b % 180) + 180) % 180;
}
/** Extent of a point set along a bearing (m). */
function extentAlong(pts: THREE.Vector3[], bearing: number) {
  const d = new THREE.Vector3(Math.sin((bearing * Math.PI) / 180), 0, -Math.cos((bearing * Math.PI) / 180));
  const s = pts.map((p) => p.dot(d));
  return Math.max(...s) - Math.min(...s);
}
const angleDiff = (a: number, b: number) => {
  const d = Math.abs((((a - b) % 180) + 180) % 180);
  return Math.min(d, 180 - d);
};
const tris = (m: THREE.Mesh) => m.geometry.attributes.position.count / 3;

describe('Starbase tank farm', () => {
  it('has the 26 horizontal and 11 deluge tank bodies', () => {
    const ids = (byName('farm-tanks').userData.parts as Range[]).map((p) => p.id);
    expect(ids.filter((i) => i.startsWith('htank:'))).toHaveLength(26);
    expect(ids.filter((i) => i.startsWith('deluge:'))).toHaveLength(11);
    // V_TANKS 5–8 fall inside the gas-generator building's mapped box and are skipped (see the module).
    expect(ids.filter((i) => i.startsWith('vtank:'))).toHaveLength(V_TANKS.length - 4);
    const vap = (byName('farm-buildings').userData.parts as Range[]).filter((p) => p.id.startsWith('vaporizer:'));
    expect(vap).toHaveLength(VAPORIZERS.count);
  });

  it('puts each horizontal tank at its mapped centre, along 13°, on its saddles', () => {
    const tanks = byName('farm-tanks');
    H_TANKS.forEach((t, i) => {
      const pts = partPoints(tanks, `htank:${i}:${t.kind}`);
      const c = boxOf(pts).getCenter(new THREE.Vector3());
      expect(Math.abs(c.x - t.at[0])).toBeLessThan(0.1);
      expect(Math.abs(c.z + t.at[1])).toBeLessThan(0.1);
      const d = TANK_SIZE[t.kind].diameter;
      // LCH4big sits lower so its top meets the 7.1 m OSM tag; the rest on the estimated saddle.
      expect(c.y).toBeCloseTo(t.kind === 'LCH4big' ? 7.1 - d / 2 : SADDLE_M + d / 2, 1);
      expect(angleDiff(axisBearing(pts), TANK_BEARING)).toBeLessThan(0.5);
      expect(extentAlong(pts, TANK_BEARING)).toBeCloseTo(TANK_SIZE[t.kind].length, 1);
    });
  });

  it('tops the methane pair (LCH4big) at the tagged 7.1 m', () => {
    const tanks = byName('farm-tanks');
    const ids = H_TANKS.map((t, i) => [t, i] as const).filter(([t]) => t.kind === 'LCH4big');
    expect(ids).toHaveLength(2);
    for (const [t, i] of ids) {
      const b = boxOf(partPoints(tanks, `htank:${i}:${t.kind}`));
      expect(Math.abs(b.max.y - 7.1)).toBeLessThan(0.1);
      expect(b.min.y).toBeGreaterThan(0);
    }
  });

  it('draws no tank whose centre falls inside a building footprint (it would be hidden)', () => {
    const tanks = byName('farm-tanks');
    const tankIds = (tanks.userData.parts as Range[]).map((p) => p.id);
    // Building footprints measured from the drawn geometry, as an oriented box along each building's bearing.
    const fps = BUILDINGS.map((b) => {
      const mesh = (byName('farm-concrete').userData.parts as Range[]).some((p) => p.id === b.id) ? byName('farm-concrete') : byName('farm-buildings');
      const pts = partPoints(mesh, b.id);
      const r = (b.bearing * Math.PI) / 180;
      const u = new THREE.Vector3(Math.sin(r), 0, -Math.cos(r));
      const v = new THREE.Vector3(Math.cos(r), 0, Math.sin(r));
      const su = pts.map((p) => p.dot(u)), sv = pts.map((p) => p.dot(v));
      return { id: b.id, u, v, u0: Math.min(...su), u1: Math.max(...su), v0: Math.min(...sv), v1: Math.max(...sv) };
    });
    const hidden: string[] = [];
    for (const id of tankIds) {
      const c = boxOf(partPoints(tanks, id)).getCenter(new THREE.Vector3());
      for (const f of fps) {
        const a = c.dot(f.u), b = c.dot(f.v);
        if (a > f.u0 && a < f.u1 && b > f.v0 && b < f.v1) hidden.push(`${id} in ${f.id}`);
      }
    }
    expect(hidden).toEqual([]);
    // The skipped ones are reported, not silently dropped.
    expect(group.userData.check.verticalTanksSkippedInsideBuilding).toEqual(['vtank:5', 'vtank:6', 'vtank:7', 'vtank:8']);
  });

  it('puts each deluge tank at its mapped centre, along 14.5°', () => {
    const tanks = byName('farm-tanks');
    const all: [string, EN, number][] = [
      ...DELUGE_TANKS.long.at.map((at, i) => [`deluge:long:${i}`, at, DELUGE_TANKS.long.length] as [string, EN, number]),
      ...DELUGE_TANKS.short.at.map((at, i) => [`deluge:short:${i}`, at, DELUGE_TANKS.short.length] as [string, EN, number])
    ];
    for (const [id, at, len] of all) {
      const pts = partPoints(tanks, id);
      const c = boxOf(pts).getCenter(new THREE.Vector3());
      expect(Math.abs(c.x - at[0])).toBeLessThan(0.1);
      expect(Math.abs(c.z + at[1])).toBeLessThan(0.1);
      expect(angleDiff(axisBearing(pts), DELUGE_TANKS.bearing)).toBeLessThan(0.5);
      expect(extentAlong(pts, DELUGE_TANKS.bearing)).toBeCloseTo(len, 1);
    }
  });

  it('draws the vertical tanks 6 m tall and 2.8 m across', () => {
    const b = boxOf(partPoints(byName('farm-tanks'), 'vtank:0'));
    expect(b.max.y).toBeCloseTo(6, 2);
    expect(b.min.y).toBeCloseTo(0, 2);
    expect(b.max.x - b.min.x).toBeCloseTo(2.8, 1);
  });

  it('keeps every vaporizer inside the mapped box, 8 m tall', () => {
    const parts = (byName('farm-buildings').userData.parts as Range[]).filter((p) => p.id.startsWith('vaporizer:'));
    for (const p of parts) {
      const b = boxOf(partPoints(byName('farm-buildings'), p.id));
      expect(b.min.x).toBeGreaterThanOrEqual(VAPORIZERS.from[0]);
      expect(b.max.x).toBeLessThanOrEqual(VAPORIZERS.to[0]);
      expect(-b.max.z).toBeGreaterThanOrEqual(VAPORIZERS.from[1]);
      expect(-b.min.z).toBeLessThanOrEqual(VAPORIZERS.to[1]);
      expect(b.max.y).toBeCloseTo(VAPORIZERS.height, 3);
    }
  });

  it('builds the blast wall 150 m long and 5.5 m tall, in concrete', () => {
    const pts = partPoints(byName('farm-concrete'), 'blastwall');
    expect(Math.abs(extentAlong(pts, 103.1) - 150)).toBeLessThan(1);
    expect(boxOf(pts).max.y).toBeCloseTo(5.5, 3);
    expect(byName('farm-concrete').material).toHaveProperty('name', 'site-concrete');
    for (const id of ['megabunker', 'subbunker', 'control', 'powerbunker']) expect(() => partPoints(byName('farm-concrete'), id)).not.toThrow();
  });

  it('stands Starhopper 17.9 m tall and 9 m across', () => {
    const steel = byName('farm-starhopper');
    const top = boxOf(steel.userData.parts.flatMap((p: Range) => partPoints(steel, p.id))).max.y;
    expect(Math.abs(top - 17.9)).toBeLessThan(0.1);
    const body = boxOf(partPoints(steel, 'starhopper:body'));
    expect(body.max.x - body.min.x).toBeCloseTo(9, 1);
    expect(boxOf(partPoints(steel, 'starhopper:leg:0')).min.y).toBeGreaterThanOrEqual(-0.01);
  });

  it('stays within budget with clean, mergeable geometry', () => {
    const triangles = meshes.reduce((s, m) => s + tris(m), 0);
    expect(triangles).toBeLessThanOrEqual(40_000);
    expect(meshes.length).toBeLessThanOrEqual(5);
    expect(group.userData.check.triangles).toBe(triangles);
    expect(group.userData.check.drawCalls).toBe(meshes.length);
    for (const m of meshes) {
      const g = m.geometry;
      expect(Object.keys(g.attributes).sort()).toEqual(['normal', 'position']);
      expect(g.boundingSphere).not.toBeNull();
      for (const a of [g.attributes.position.array, g.attributes.normal.array]) expect(Array.from(a).every(Number.isFinite)).toBe(true);
    }
  });

  it('winds tank faces to match their normals (visible from outside)', () => {
    const g = byName('farm-tanks').geometry;
    const p = g.attributes.position, n = g.attributes.normal;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
    let agree = 0, total = 0;
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      const f = b.clone().sub(a).cross(c.clone().sub(a));
      if (f.lengthSq() < 1e-8) continue;
      nn.fromBufferAttribute(n, i);
      total++;
      if (f.dot(nn) > 0) agree++;
    }
    expect(agree / total).toBeGreaterThan(0.99);
  });
});
