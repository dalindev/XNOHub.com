import { Graph, pathTo } from '@/lib/routing/graph';

// Fibre routes between rep nodes over real submarine cables plus overland
// fibre. Overland links are modelled, not mapped: landing points join any rep
// or landing within reach, at 1.3× the great-circle distance (real terrestrial
// fibre rarely runs straight). Signals in fibre travel at c / 1.468.

export const FIBRE_KM_PER_MS = 299_792.458 / 1.468 / 1000; // ≈ 204 km per ms
const OVERLAND_DETOUR = 1.3;
const LANDING_REACH_KM = 900; // landing ↔ landing overland backbone
const REP_REACH_KM = 2500; // rep ↔ landing
const REP_DIRECT_KM = 2500; // rep ↔ rep overland (same region)
const SNAP_DEG = 0.05; // cable points this close are the same vertex

export interface CablesFile {
  cables: Record<string, string>;
  lines: [string, [number, number][]][];
  landings: [number, number, string][];
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Route {
  /** lat/lon points along the way, source first. */
  points: GeoPoint[];
  km: number;
  ms: number;
  /** Submarine cables used, by name. */
  cables: string[];
}

const D2R = Math.PI / 180;
export function haversineKm(a: GeoPoint, b: GeoPoint) {
  const dLat = (b.lat - a.lat) * D2R, dLon = (b.lon - a.lon) * D2R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export class FibreNetwork {
  private graph: Graph;
  private pts: GeoPoint[] = [];
  private edgeCable = new Map<string, string>();
  private repVertex: number[] = [];
  private cache = new Map<number, ReturnType<Graph['dijkstra']>>();

  constructor(data: CablesFile, reps: GeoPoint[]) {
    const index = new Map<string, number>();
    const vertex = (lat: number, lon: number) => {
      const k = `${Math.round(lat / SNAP_DEG)},${Math.round(lon / SNAP_DEG)}`;
      let v = index.get(k);
      if (v === undefined) {
        v = this.pts.length;
        this.pts.push({ lat, lon });
        index.set(k, v);
      }
      return v;
    };
    const cableEdges: [number, number, number, string][] = [];
    for (const [id, line] of data.lines) {
      for (let i = 1; i < line.length; i++) {
        const a = vertex(line[i - 1][1], line[i - 1][0]);
        const b = vertex(line[i][1], line[i][0]);
        cableEdges.push([a, b, haversineKm(this.pts[a], this.pts[b]), data.cables[id] ?? id]);
      }
    }
    const landings = data.landings.map(([lon, lat]) => vertex(lat, lon));
    this.repVertex = reps.map((r) => {
      const v = this.pts.length;
      this.pts.push(r);
      return v;
    });

    this.graph = new Graph(this.pts.length);
    for (const [a, b, km, name] of cableEdges) {
      this.graph.link(a, b, km);
      this.edgeCable.set(a < b ? `${a}:${b}` : `${b}:${a}`, name);
    }
    // Cable ends that stop short of a mapped landing point still connect.
    const overland = (a: number, b: number) => this.graph.link(a, b, haversineKm(this.pts[a], this.pts[b]) * OVERLAND_DETOUR);
    const near = (from: number, candidates: number[], reachKm: number) =>
      candidates.filter((c) => c !== from && haversineKm(this.pts[from], this.pts[c]) <= reachKm);
    for (const l of landings) for (const m of near(l, landings, LANDING_REACH_KM)) if (l < m) overland(l, m);
    for (const r of this.repVertex) {
      const land = near(r, landings, REP_REACH_KM)
        .sort((a, b) => haversineKm(this.pts[r], this.pts[a]) - haversineKm(this.pts[r], this.pts[b]))
        .slice(0, 6);
      for (const l of land) overland(r, l);
      for (const r2 of near(r, this.repVertex, REP_DIRECT_KM)) if (r < r2) overland(r, r2);
    }
  }

  get stats() {
    return { vertices: this.pts.length, edges: this.graph.edgeCount };
  }

  /** Route between two reps (indices into the reps passed to the constructor). */
  route(fromRep: number, toRep: number): Route | null {
    const s = this.repVertex[fromRep];
    const t = this.repVertex[toRep];
    let tree = this.cache.get(s);
    if (!tree) {
      tree = this.graph.dijkstra(s);
      this.cache.set(s, tree);
    }
    const path = pathTo(tree.prev, s, t);
    if (!path) return null;
    const cables: string[] = [];
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const name = this.edgeCable.get(a < b ? `${a}:${b}` : `${b}:${a}`);
      if (name && cables[cables.length - 1] !== name) cables.push(name);
    }
    const km = tree.dist[t];
    return { points: path.map((v) => this.pts[v]), km, ms: km / FIBRE_KM_PER_MS, cables };
  }
}
