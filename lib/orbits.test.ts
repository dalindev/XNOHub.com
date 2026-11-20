import { describe, expect, it } from 'vitest';
import { json2satrec, propagate, gstime } from 'satellite.js';
import { eciAt, eciToScene, periodMinutes, rebaseRows, type SatRow } from './orbits';
import fixture from './orbits.fixture.json';

// Same element conversion as scripts/build-starlink.mjs (kept in step by hand).
const MU = 398600.4418, RE = 6378.137, J2 = 1.08263e-3, D2R = Math.PI / 180;
function toRow(s: (typeof fixture)[number]): SatRow {
  const n = (s.MEAN_MOTION * 2 * Math.PI) / 86400;
  const a = Math.cbrt(MU / (n * n));
  const inc = s.INCLINATION * D2R;
  const p = (RE / a) ** 2;
  const raanDot = -1.5 * n * J2 * p * Math.cos(inc);
  const argpDot = 0.75 * n * J2 * p * (5 * Math.cos(inc) ** 2 - 1);
  return [s.NORAD_CAT_ID, 2, a, inc, s.RA_OF_ASC_NODE * D2R, (s.ARG_OF_PERICENTER + s.MEAN_ANOMALY) * D2R, n + argpDot, raanDot];
}

describe('eciAt vs SGP4', () => {
  for (const s of fixture) {
    it(`${s.OBJECT_NAME} stays within 25 km of SGP4 over 24 h`, () => {
      const satrec = json2satrec(s as never);
      const row = toRow(s);
      const epoch = Date.parse(s.EPOCH + 'Z');
      for (const h of [0, 1, 6, 24]) {
        const date = new Date(epoch + h * 3600e3);
        const ref = propagate(satrec, date)!.position as { x: number; y: number; z: number };
        const p = eciAt(row, h * 3600);
        const x = p[0], y = p[1], z = p[2];
        const err = Math.hypot(x - ref.x, y - ref.y, z - ref.z);
        expect(err, `${h} h`).toBeLessThan(25);
      }
    });
  }

  it('maps to Earth-fixed like SGP4 + GMST (sub-point within 0.3°)', () => {
    const s = fixture[0];
    const satrec = json2satrec(s as never);
    const date = new Date(Date.parse(s.EPOCH + 'Z') + 3 * 3600e3);
    const ref = propagate(satrec, date)!.position as { x: number; y: number; z: number };
    const g = gstime(date);
    const v = eciToScene(ref.x, ref.y, ref.z, g);
    // scene → lat/lon
    const lat = Math.asin(v.clone().normalize().y) / D2R;
    const lon = Math.atan2(-v.z, v.x) / D2R;
    const xe = ref.x * Math.cos(g) + ref.y * Math.sin(g);
    const ye = -ref.x * Math.sin(g) + ref.y * Math.cos(g);
    expect(lat).toBeCloseTo(Math.asin(ref.z / Math.hypot(ref.x, ref.y, ref.z)) / D2R, 1);
    expect(lon).toBeCloseTo(Math.atan2(ye, xe) / D2R, 1);
  });
});

describe('orbit helpers', () => {
  it('a ~550 km Starlink orbits in about 95 minutes', () => {
    const row = toRow(fixture[0]);
    expect(periodMinutes(row)).toBeGreaterThan(90);
    expect(periodMinutes(row)).toBeLessThan(97);
  });

  it('rebasing angles keeps the position', () => {
    const row = toRow(fixture[1]);
    const copy = [...row] as SatRow;
    const before = eciAt(row, 50_000);
    rebaseRows([copy], 30_000);
    const after = eciAt(copy, 20_000);
    expect(Math.hypot(before[0] - after[0], before[1] - after[1], before[2] - after[2])).toBeLessThan(0.01);
  });
});
