import * as THREE from 'three';
import { Graph, pathTo } from '@/lib/routing/graph';
import { latLonToUnit, EARTH_RADIUS_KM } from '@/lib/geo';
import type { GeoPoint } from '@/lib/routing/fiber';

// Starlink routes: up from the sending node to the best satellite overhead,
// along the laser mesh at the speed of light in vacuum, and down to each
// receiving node. "What if the Nano network ran over Starlink": real Nano
// nodes sit in data centres on fibre, so this is a comparison, not a claim.

export const LIGHT_KM_PER_MS = 299.792458;
const MIN_ELEVATION = 25 * (Math.PI / 180); // dish ↔ satellite

export interface SpaceRoute {
  /** Scene positions: ground, satellites…, ground. */
  points: THREE.Vector3[];
  /** Satellite indices used. */
  sats: number[];
  km: number;
  ms: number;
}

/** Elevation angle (rad) of point p seen from ground point g (both scene units). */
function elevation(g: THREE.Vector3, p: THREE.Vector3) {
  const up = g.clone().normalize();
  const los = p.clone().sub(g).normalize();
  return Math.asin(THREE.MathUtils.clamp(up.dot(los), -1, 1));
}

export class SpaceNetwork {
  private graph: Graph;
  private pos: Float32Array;
  private tree: { source: number; dist: Float64Array; prev: Int32Array } | null = null;
  private gateways = new Map<string, number>();

  /** @param pos packed scene xyz of every satellite at this moment */
  constructor(pos: Float32Array, links: [number, number][]) {
    this.pos = pos;
    const n = pos.length / 3;
    this.graph = new Graph(n);
    for (const [a, b] of links) {
      const d = Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]) * EARTH_RADIUS_KM;
      this.graph.link(a, b, d);
    }
  }

  sat(i: number, out = new THREE.Vector3()) {
    return out.fromArray(this.pos, i * 3);
  }

  /** Highest-elevation linked satellite above a ground point, or -1. */
  gateway(ground: THREE.Vector3, linked: (i: number) => boolean): number {
    let best = -1;
    let bestEl = MIN_ELEVATION;
    const p = new THREE.Vector3();
    const n = this.pos.length / 3;
    for (let i = 0; i < n; i++) {
      p.fromArray(this.pos, i * 3);
      if (p.distanceToSquared(ground) > 0.06) continue; // > ~1,560 km away: below the horizon anyway
      const el = elevation(ground, p);
      if (el > bestEl && linked(i)) {
        bestEl = el;
        best = i;
      }
    }
    return best;
  }

  // The network is a snapshot (rebuilt every few seconds), so gateways can be cached for its life.
  private cachedGateway(p: GeoPoint, g: THREE.Vector3, linked: (i: number) => boolean) {
    const k = `${p.lat},${p.lon}`;
    let v = this.gateways.get(k);
    if (v === undefined) {
      v = this.gateway(g, linked);
      this.gateways.set(k, v);
    }
    return v;
  }

  route(from: GeoPoint, to: GeoPoint, linked: (i: number) => boolean): SpaceRoute | null {
    const g0 = latLonToUnit(from.lat, from.lon);
    const g1 = latLonToUnit(to.lat, to.lon);
    const up = this.cachedGateway(from, g0, linked);
    const down = this.cachedGateway(to, g1, linked);
    if (up < 0 || down < 0) return null;
    if (!this.tree || this.tree.source !== up) {
      const { dist, prev } = this.graph.dijkstra(up);
      this.tree = { source: up, dist, prev };
    }
    const path = pathTo(this.tree.prev, up, down);
    if (!path) return null;
    const points = [g0, ...path.map((i) => this.sat(i)), g1];
    let km = 0;
    for (let i = 1; i < points.length; i++) km += points[i].distanceTo(points[i - 1]) * EARTH_RADIUS_KM;
    return { points, sats: path, km, ms: km / LIGHT_KM_PER_MS };
  }
}
