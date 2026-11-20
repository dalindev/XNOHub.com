import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Graph, pathTo } from './graph';
import { FibreNetwork, haversineKm, FIBRE_KM_PER_MS, type CablesFile } from './fiber';
import { SpaceNetwork, LIGHT_KM_PER_MS, type SpaceRoute } from './space';
import { MAX_LASER_KM } from './laser-links';
import { laserLinksAt } from '../constellation';
import { EARTH_RADIUS_KM } from '../geo';
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

  describe('Starlink', () => {
    const sl = JSON.parse(readFileSync('public/data/starlink.json', 'utf8')) as StarlinkFile;
    const EARTH_SPIN = 7.2921e-5; // rad/s
    /** Where every satellite is `hours` after the data was made (Earth-fixed scene positions). */
    const positions = (hours: number) => {
      const dt = hours * 3600;
      const pos = new Float32Array(sl.sats.length * 3);
      const tmp = [0, 0, 0];
      sl.sats.forEach((row, i) => {
        eciAt(row, dt, tmp);
        eciToScene(tmp[0], tmp[1], tmp[2], 1.234 + dt * EARTH_SPIN).toArray(pos, i * 3);
      });
      return pos;
    };
    /** Every hop of a route is something a real signal could do. */
    const expectRealHops = (r: SpaceRoute) => {
      for (let i = 1; i < r.points.length; i++) {
        const a = r.points[i - 1], b = r.points[i];
        expect(a.distanceTo(b) * EARTH_RADIUS_KM).toBeLessThan(MAX_LASER_KM);
        // Lowest point of the hop: well above the atmosphere, never through the Earth.
        const satToSat = i > 1 && i < r.points.length - 1;
        if (satToSat) expect(a.clone().add(b).multiplyScalar(0.5).length() * EARTH_RADIUS_KM - EARTH_RADIUS_KM).toBeGreaterThan(80);
      }
    };

    // The laser mesh is rebuilt from where the satellites are now. A stored
    // link list goes stale within minutes and turns into shortcuts through
    // the Earth, so check well after the data's own epoch too.
    for (const hours of [0, 3.4, 16, 40]) {
      it(`routes New York → Frankfurt over real hops ${hours} h after the data was made`, () => {
        const space = new SpaceNetwork(positions(hours), laserLinksAt(sl.sats, hours * 3600));
        const r = space.route(NY, FRANKFURT)!;
        expect(r).not.toBeNull();
        expect(r.sats.length).toBeGreaterThan(2);
        expectRealHops(r);
        const gc = haversineKm(NY, FRANKFURT);
        expect(r.km).toBeGreaterThan(gc);
        expect(r.km).toBeLessThan(gc * 1.8);
        expect(r.ms).toBeCloseTo(r.km / LIGHT_KM_PER_MS);
        expect(r.ms).toBeLessThan(fibre.route(0, 1)!.ms);
      });
    }

    it('never routes over a link whose satellites have since moved apart', () => {
      // Links from the data's epoch, positions six hours later.
      const space = new SpaceNetwork(positions(6), laserLinksAt(sl.sats, 0));
      const r = space.route(NY, FRANKFURT);
      if (r) expectRealHops(r);
    });
  });
});
