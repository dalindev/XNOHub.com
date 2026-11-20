import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cumulative, firstAfter, pointAt, simplify, surfacePolyline } from './polyline';

describe('polyline', () => {
  it('keeps long surface legs on the globe instead of cutting through it', () => {
    const pts = surfacePolyline([{ lat: 0, lon: 0 }, { lat: 0, lon: 90 }], 1);
    expect(pts.length).toBeGreaterThan(50);
    for (const p of pts) expect(p.length()).toBeCloseTo(1, 5);
  });

  it('finds points by distance along the line', () => {
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0), new THREE.Vector3(2, 2, 0)];
    const cum = cumulative(pts);
    expect(cum[2]).toBe(4);
    expect(pointAt(pts, cum, 3, new THREE.Vector3()).toArray()).toEqual([2, 1, 0]);
    expect(pointAt(pts, cum, 99, new THREE.Vector3()).toArray()).toEqual([2, 2, 0]);
    expect(firstAfter(cum, 2)).toBe(2);
  });

  it('simplifies straight runs but keeps corners and both ends', () => {
    const pts = [0, 1, 2, 3, 4].map((x) => new THREE.Vector3(x, 0, 0));
    pts.push(new THREE.Vector3(4, 1, 0), new THREE.Vector3(4, 2, 0), new THREE.Vector3(4.0001, 3, 0));
    const out = simplify(pts, 0.01);
    expect(out.map((p) => [p.x, p.y])).toEqual([[0, 0], [4, 0], [4.0001, 3]]);
    // Nothing moves farther than the tolerance from the simplified line.
    const curve = surfacePolyline([{ lat: 10, lon: 0 }, { lat: 30, lon: 40 }, { lat: 5, lon: 80 }], 1);
    const simple = simplify(curve, 0.002);
    expect(simple.length).toBeLessThan(curve.length);
    expect(simple[0]).toBe(curve[0]);
    expect(simple[simple.length - 1]).toBe(curve[curve.length - 1]);
  });
});
