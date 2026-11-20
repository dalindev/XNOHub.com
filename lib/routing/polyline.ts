import * as THREE from 'three';
import { latLonToUnit } from '@/lib/geo';
import type { GeoPoint } from '@/lib/routing/fiber';

const MAX_STEP = 1.5 * (Math.PI / 180); // subdivide surface legs every 1.5°

/**
 * Surface polyline (lat/lon) → scene points just above the ground, with long
 * legs split along the great circle so they hug the globe instead of cutting
 * through it.
 */
export function surfacePolyline(points: GeoPoint[], radius = 1.0015): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  let prev: THREE.Vector3 | null = null;
  for (const p of points) {
    const v = latLonToUnit(p.lat, p.lon);
    if (prev) {
      const angle = prev.angleTo(v);
      const steps = Math.ceil(angle / MAX_STEP);
      for (let s = 1; s < steps; s++) out.push(slerpUnit(prev, v, s / steps).multiplyScalar(radius));
    }
    out.push(v.clone().multiplyScalar(radius));
    prev = v;
  }
  return out;
}

function slerpUnit(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const w = a.angleTo(b);
  if (w < 1e-6) return a.clone();
  const s = Math.sin(w);
  return a.clone().multiplyScalar(Math.sin((1 - t) * w) / s).add(b.clone().multiplyScalar(Math.sin(t * w) / s));
}

/** Cumulative length along a polyline; last entry is the total. */
export function cumulative(points: THREE.Vector3[]): Float32Array {
  const c = new Float32Array(points.length);
  for (let i = 1; i < points.length; i++) c[i] = c[i - 1] + points[i].distanceTo(points[i - 1]);
  return c;
}

/** Point at distance d along the polyline (binary search on cum). */
export function pointAt(points: THREE.Vector3[], cum: Float32Array, d: number, out: THREE.Vector3) {
  const n = points.length;
  if (d <= 0) return out.copy(points[0]);
  if (d >= cum[n - 1]) return out.copy(points[n - 1]);
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const t = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return out.copy(points[lo]).lerp(points[hi], t);
}

/** Index of the first vertex with cum > d. */
export function firstAfter(cum: Float32Array, d: number) {
  let lo = 0, hi = cum.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Ramer–Douglas–Peucker in 3D: drops points that sit within `tolerance`
 * (scene units) of the line through their neighbours. Keeps both ends.
 */
export function simplify(points: THREE.Vector3[], tolerance: number): THREE.Vector3[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  const ab = new THREE.Vector3(), ap = new THREE.Vector3();
  while (stack.length) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;
    ab.subVectors(points[b], points[a]);
    const len2 = ab.lengthSq();
    let worst = -1, worstD2 = tolerance * tolerance;
    for (let i = a + 1; i < b; i++) {
      ap.subVectors(points[i], points[a]);
      const t = len2 > 0 ? THREE.MathUtils.clamp(ap.dot(ab) / len2, 0, 1) : 0;
      const d2 = ap.addScaledVector(ab, -t).lengthSq();
      if (d2 > worstD2) {
        worstD2 = d2;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
