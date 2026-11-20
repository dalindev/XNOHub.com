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
