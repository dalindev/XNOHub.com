// Small weighted graph + Dijkstra on typed arrays. Built once, queried per
// confirmation; ~15k vertices answer in a few milliseconds.

export class Graph {
  private heads: Int32Array;
  private next: number[] = [];
  private to: number[] = [];
  private w: number[] = [];

  constructor(readonly size: number) {
    this.heads = new Int32Array(size).fill(-1);
  }

  /** Undirected edge. */
  link(a: number, b: number, weight: number) {
    if (a === b || !(weight >= 0)) return;
    this.addArc(a, b, weight);
    this.addArc(b, a, weight);
  }

  private addArc(a: number, b: number, weight: number) {
    this.to.push(b);
    this.w.push(weight);
    this.next.push(this.heads[a]);
    this.heads[a] = this.to.length - 1;
  }

  get edgeCount() {
    return this.to.length / 2;
  }

  /** Shortest distances and predecessors from one source. */
  dijkstra(source: number) {
    return this.dijkstraFrom([source], [0]);
  }

  /**
   * Shortest distances from several sources at once, each starting at its own
   * distance (a ground station that can reach several satellites, each at its
   * own range). A source's predecessor stays -1.
   */
  dijkstraFrom(sources: ArrayLike<number>, start: ArrayLike<number>): { dist: Float64Array; prev: Int32Array } {
    const dist = new Float64Array(this.size).fill(Infinity);
    const prev = new Int32Array(this.size).fill(-1);
    const heap = new MinHeap();
    for (let i = 0; i < sources.length; i++) {
      if (start[i] < dist[sources[i]]) {
        dist[sources[i]] = start[i];
        heap.push(sources[i], start[i]);
      }
    }
    while (heap.length) {
      const [u, d] = heap.pop();
      if (d > dist[u]) continue;
      for (let e = this.heads[u]; e !== -1; e = this.next[e]) {
        const v = this.to[e];
        const nd = d + this.w[e];
        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = u;
          heap.push(v, nd);
        }
      }
    }
    return { dist, prev };
  }
}

/** Vertex path source → target from a predecessor array, or null if unreachable. */
export function pathTo(prev: Int32Array, source: number, target: number): number[] | null {
  if (source === target) return [source];
  if (prev[target] === -1) return null;
  const out: number[] = [];
  for (let v = target; v !== -1; v = prev[v]) {
    out.push(v);
    if (v === source) return out.reverse();
  }
  return null;
}

/** Vertex path from whichever source the search reached `target` from, to `target`. */
export function pathFromSource(prev: Int32Array, target: number): number[] {
  const out: number[] = [];
  for (let v = target; v !== -1 && out.length <= prev.length; v = prev[v]) out.push(v);
  return out.reverse();
}

class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];
  get length() {
    return this.ids.length;
  }
  push(id: number, key: number) {
    const { ids, keys } = this;
    ids.push(id);
    keys.push(key);
    let i = ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      ids[i] = ids[p];
      keys[i] = keys[p];
      i = p;
    }
    ids[i] = id;
    keys[i] = key;
  }
  pop(): [number, number] {
    const { ids, keys } = this;
    const top: [number, number] = [ids[0], keys[0]];
    const id = ids.pop()!;
    const key = keys.pop()!;
    if (ids.length) {
      let i = 0;
      const n = ids.length;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && keys[r] < keys[l] ? r : l;
        if (keys[c] >= key) break;
        ids[i] = ids[c];
        keys[i] = keys[c];
        i = c;
      }
      ids[i] = id;
      keys[i] = key;
    }
    return top;
  }
}
