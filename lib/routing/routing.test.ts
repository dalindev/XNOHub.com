import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Graph, pathTo } from './graph';
import { FibreNetwork, haversineKm, FIBRE_KM_PER_MS, type CablesFile } from './fiber';
import { SpaceNetwork, LIGHT_KM_PER_MS } from './space';
import { eciAt, eciToScene, type StarlinkFile } from '../orbits';

describe('Graph', () => {
  it('finds the cheaper detour', () => {
    const g = new Graph(4);
    g.link(0, 1, 10);
    g.link(1, 3, 10);
    g.link(0, 2, 3);
    g.link(2, 3, 3);
    const { dist, prev } = g.dijkstra(0);
    expect(dist[3]).toBe(6);
    expect(pathTo(prev, 0, 3)).toEqual([0, 2, 3]);
    expect(pathTo(prev, 0, 0)).toEqual([0]);
  });

  it('reports unreachable vertices', () => {
    const g = new Graph(3);
    g.link(0, 1, 1);
    expect(pathTo(g.dijkstra(0).prev, 0, 2)).toBeNull();
  });
});

const NY = { lat: 40.71, lon: -74.0 };
const FRANKFURT = { lat: 50.11, lon: 8.68 };
const TOKYO = { lat: 35.68, lon: 139.69 };

describe('real data', () => {
  const cables = JSON.parse(readFileSync('public/data/cables.json', 'utf8')) as CablesFile;
  const fibre = new FibreNetwork(cables, [NY, FRANKFURT, TOKYO]);

  it('routes New York → Frankfurt over a transatlantic cable in a plausible time', () => {
    const r = fibre.route(0, 1)!;
    expect(r).not.toBeNull();
    expect(r.cables.length).toBeGreaterThan(0);
    const gc = haversineKm(NY, FRANKFURT); // ~6,200 km
    expect(r.km).toBeGreaterThan(gc);
    expect(r.km).toBeLessThan(gc * 1.6);
    expect(r.ms).toBeGreaterThan(28); // real one-way NY–FRA is ~35–40 ms
    expect(r.ms).toBeLessThan(50);
  });

  it('reaches Tokyo from Frankfurt', () => {
    const r = fibre.route(1, 2)!;
    expect(r).not.toBeNull();
    expect(r.ms).toBeGreaterThan(haversineKm(FRANKFURT, TOKYO) / FIBRE_KM_PER_MS);
  });

  it('routes New York → Frankfurt through Starlink faster than fibre', () => {
    const sl = JSON.parse(readFileSync('public/data/starlink.json', 'utf8')) as StarlinkFile;
    const pos = new Float32Array(sl.sats.length * 3);
    const tmp = [0, 0, 0];
    sl.sats.forEach((row, i) => {
      eciAt(row, 0, tmp);
      eciToScene(tmp[0], tmp[1], tmp[2], 1.234, undefined).toArray(pos, i * 3);
    });
    const linked = new Set(sl.links.flat());
    const space = new SpaceNetwork(pos, sl.links);
    const r = space.route(NY, FRANKFURT, (i) => linked.has(i))!;
    expect(r).not.toBeNull();
    expect(r.sats.length).toBeGreaterThan(2);
    expect(r.km).toBeGreaterThan(haversineKm(NY, FRANKFURT));
    expect(r.ms).toBeCloseTo(r.km / LIGHT_KM_PER_MS);
    expect(r.ms).toBeLessThan(fibre.route(0, 1)!.ms);
  });
});
