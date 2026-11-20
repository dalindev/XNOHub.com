import * as THREE from 'three';
import { Graph, pathFromSource } from '@/lib/routing/graph';
import { MAX_LASER_KM } from '@/lib/routing/laser-links';
import { latLonToUnit, EARTH_RADIUS_KM } from '@/lib/geo';
import type { GeoPoint } from '@/lib/routing/fiber';

// Starlink routes: up from the sending node to a satellite overhead, along the
// laser mesh at the speed of light in vacuum, and down to the receiving node.
// The satellites at each end are the ones that make the whole trip shortest,
// as a real network would choose. "What if the Nano network ran over
// Starlink": real Nano nodes sit in data centres on fibre, so this is a
// comparison, not a claim.

export const LIGHT_KM_PER_MS = 299.792458;
const MIN_ELEVATION = 25 * (Math.PI / 180); // dish ↔ satellite
const REACH2 = 0.06; // (scene units)²: beyond ~1,560 km a satellite is below 25° anyway

export interface SpaceRoute {
  /** Scene positions: ground, satellites…, ground. */
  points: THREE.Vector3[];
  /** Satellite indices used. */
  sats: number[];
  km: number;
  ms: number;
}

interface Overhead {
  sats: number[];
  /** Slant range to each, km. */
  km: number[];
}

/** A snapshot of the constellation: where every satellite is, and which pairs are laser-linked. */
export class SpaceNetwork {
  private graph: Graph;
  private pos: Float32Array;
  private linked: Uint8Array;
  private overhead = new Map<string, Overhead>();
  private trees = new Map<string, { dist: Float64Array; prev: Int32Array }>();

  /**
   * @param pos   packed scene xyz of every satellite at this moment
   * @param links packed index pairs (see buildLaserLinks)
   */
  constructor(pos: Float32Array, links: ArrayLike<number>) {
    this.pos = pos;
    const n = pos.length / 3;
    this.graph = new Graph(n);
    this.linked = new Uint8Array(n);
    for (let k = 0; k + 1 < links.length; k += 2) {
      const a = links[k], b = links[k + 1];
      const d = Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]) * EARTH_RADIUS_KM;
      // A link list that has gone stale (the satellites have moved on) must
      // never become a shortcut through the Earth: out of range, out of the graph.
      if (d > MAX_LASER_KM) continue;
      this.graph.link(a, b, d);
      this.linked[a] = this.linked[b] = 1;
    }
  }

  sat(i: number, out = new THREE.Vector3()) {
    return out.fromArray(this.pos, i * 3);
  }

  /** Laser-linked satellites at least 25° above the horizon of a ground point. Cached: the network is a snapshot. */
  private above(p: GeoPoint, ground: THREE.Vector3): Overhead {
    const key = `${p.lat},${p.lon}`;
    let found = this.overhead.get(key);
    if (found) return found;
    found = { sats: [], km: [] };
    const { pos, linked } = this;
    const gx = ground.x, gy = ground.y, gz = ground.z;
    for (let i = 0; i < linked.length; i++) {
      if (!linked[i]) continue;
      const dx = pos[i * 3] - gx, dy = pos[i * 3 + 1] - gy, dz = pos[i * 3 + 2] - gz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > REACH2) continue;
      const d = Math.sqrt(d2);
      // The ground point is a unit vector, so it is also "straight up".
      if (Math.asin((dx * gx + dy * gy + dz * gz) / d) < MIN_ELEVATION) continue;
      found.sats.push(i);
      found.km.push(d * EARTH_RADIUS_KM);
    }
    this.overhead.set(key, found);
    return found;
  }

  route(from: GeoPoint, to: GeoPoint): SpaceRoute | null {
    const g0 = latLonToUnit(from.lat, from.lon);
    const g1 = latLonToUnit(to.lat, to.lon);
    const up = this.above(from, g0);
    const down = this.above(to, g1);
    if (!up.sats.length || !down.sats.length) return null;

    // One search per sender covers every receiver.
    const key = `${from.lat},${from.lon}`;
    let tree = this.trees.get(key);
    if (!tree) {
      if (this.trees.size >= 8) this.trees.clear();
      tree = this.graph.dijkstraFrom(up.sats, up.km);
      this.trees.set(key, tree);
    }
    let last = -1, km = Infinity;
    for (let k = 0; k < down.sats.length; k++) {
      const total = tree.dist[down.sats[k]] + down.km[k];
      if (total < km) {
        km = total;
        last = down.sats[k];
      }
    }
    if (last < 0) return null;
    const sats = pathFromSource(tree.prev, last);
    return { points: [g0, ...sats.map((i) => this.sat(i)), g1], sats, km, ms: km / LIGHT_KM_PER_MS };
  }
}
