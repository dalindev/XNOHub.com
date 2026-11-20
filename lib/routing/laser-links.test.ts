import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildLaserLinks, laserLinkJob, MAX_LASER_KM } from './laser-links';
import { laserLinksAt } from '../constellation';
import { eciAt, hasLasers, type StarlinkFile } from '../orbits';

const pairs = (links: Uint32Array) => Array.from({ length: links.length / 2 }, (_, k) => `${links[k * 2]}-${links[k * 2 + 1]}`);

describe('buildLaserLinks', () => {
  // A at 550 km; B beside it, C ahead of it, all flying the same way. D is close, but flying the other way.
  const pos = [6921, 0, 0, 6921, 0, 500, 6921, 300, 0, 6921, -200, 0];
  const dir = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0];

  it('links neighbours that fly the same way, never one on a crossing orbit', () => {
    const got = pairs(buildLaserLinks(pos, dir, [1, 1, 1, 1]));
    expect(got).toContain('0-1');
    expect(got).toContain('0-2');
    expect(got.some((p) => p.split('-').includes('3'))).toBe(false);
  });

  it('lists each link once', () => {
    const got = pairs(buildLaserLinks(pos, dir, [1, 1, 1, 1]));
    expect(new Set(got).size).toBe(got.length);
  });

  it('leaves out satellites without lasers and ones out of range', () => {
    expect(pairs(buildLaserLinks(pos, dir, [1, 0, 1, 1]))).toEqual(['0-2']);
    const far = [6921, 0, 0, 6921, MAX_LASER_KM + 50, 0];
    expect(buildLaserLinks(far, [0, 1, 0, 0, 1, 0], [1, 1]).length).toBe(0);
  });
});

describe('laserLinkJob', () => {
  it('gives the same links a slice at a time as all at once', () => {
    const pos: number[] = [], dir: number[] = [];
    // 60 satellites round one orbit plus 60 on a neighbouring one, all flying the same way.
    for (let ring = 0; ring < 2; ring++) {
      for (let k = 0; k < 60; k++) {
        const a = (k / 60) * 2 * Math.PI + ring * 0.03;
        pos.push(6921 * Math.cos(a), 6921 * Math.sin(a), ring * 400);
        dir.push(-Math.sin(a), Math.cos(a), 0);
      }
    }
    const eligible = new Array(120).fill(1);
    const job = laserLinkJob(pos, dir, eligible);
    let steps = 0;
    while (!job.step(7)) steps++;
    expect(steps).toBeGreaterThan(10);
    expect(Array.from(job.result())).toEqual(Array.from(buildLaserLinks(pos, dir, eligible)));
    // Every satellite has its neighbours ahead, behind and on the other ring.
    const degree = new Array(120).fill(0);
    job.result().forEach((i) => degree[i]++);
    expect(Math.min(...degree)).toBeGreaterThanOrEqual(3);
  });
});

describe('laser links on the real constellation', () => {
  const sl = JSON.parse(readFileSync('public/data/starlink.json', 'utf8')) as StarlinkFile;

  // The links are rebuilt as the satellites move. Hours or days after the data
  // was made they must still join neighbours, not satellites that have drifted
  // to opposite sides of the Earth.
  for (const hours of [0, 5, 30]) {
    it(`keeps every link within laser range ${hours} h after the data was made`, () => {
      const dt = hours * 3600;
      const t0 = performance.now();
      const links = laserLinksAt(sl.sats, dt);
      const took = performance.now() - t0;
      const a = [0, 0, 0], b = [0, 0, 0];
      const degree = new Uint8Array(sl.sats.length);
      let longest = 0;
      for (let k = 0; k < links.length; k += 2) {
        eciAt(sl.sats[links[k]], dt, a);
        eciAt(sl.sats[links[k + 1]], dt, b);
        longest = Math.max(longest, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
        degree[links[k]]++;
        degree[links[k + 1]]++;
      }
      expect(longest).toBeLessThan(MAX_LASER_KM);
      const lasers = sl.sats.filter(hasLasers).length;
      const meshed = sl.sats.filter((r, i) => hasLasers(r) && degree[i] >= 2).length;
      expect(meshed / lasers).toBeGreaterThan(0.95);
      expect(took).toBeLessThan(500); // ~25 ms in a browser; a loose bound for slow CI
    });
  }
});
