#!/usr/bin/env node
// Builds public/data/starlink.json: every Starlink in orbit, as compact mean
// elements.
//
//   node scripts/build-starlink.mjs
//
// Source: CelesTrak GP data (OMM JSON), public, refreshed several times a day.
// Orbits are treated as circular with J2 drift (Starlink eccentricity ~1e-4),
// which keeps positions within a few km for days and lets the GPU move all
// ~11,000 satellites from a handful of numbers each. See lib/orbits.ts.
//
// Versions are estimated from launch date (CelesTrak doesn't say):
//   v1.0  before 2021-06 · v1.5  2021-06 → 2023-02 · v2mini  2023-02 onward
// V3 flies on Starship; none are identifiable in the catalogue yet.
//
// Laser links are not stored here: they change as the satellites move, so the
// site works them out in the browser (lib/routing/laser-links.ts).

import { writeFile, mkdir } from 'node:fs/promises';

const URL_GP = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json';
const OUT = new URL('../public/data/starlink.json', import.meta.url);
const MU = 398600.4418; // km^3/s^2
const RE = 6378.137; // km
const J2 = 1.08263e-3;
const D2R = Math.PI / 180;

// CelesTrak answers 403 when the same group is fetched again before it has
// updated (~every 2 h). STARLINK_GP_FILE=path reuses a saved download.
import { readFile } from 'node:fs/promises';
let gp;
if (process.env.STARLINK_GP_FILE) {
  gp = JSON.parse(await readFile(process.env.STARLINK_GP_FILE, 'utf8'));
} else {
  const res = await fetch(URL_GP, { signal: AbortSignal.timeout(60_000) });
  if (res.status === 403) throw new Error('CelesTrak: 403, already downloaded recently; retry in ~2 h or set STARLINK_GP_FILE');
  if (!res.ok) throw new Error(`CelesTrak: HTTP ${res.status}`);
  gp = await res.json();
}
if (!Array.isArray(gp) || gp.length < 1000) throw new Error(`CelesTrak: only ${gp.length} objects`);

const baseEpoch = Math.max(...gp.map((s) => Date.parse(s.EPOCH + 'Z')));

const version = (id) => {
  const ym = id.slice(0, 4) + id.slice(5, 8); // "2019-074B" → year + launch number
  const year = Number(id.slice(0, 4));
  const launch = Number(id.slice(5, 8));
  if (year < 2021 || (year === 2021 && launch < 40)) return 0; // v1.0 (rough cut: mid-2021)
  if (year < 2023 || (year === 2023 && launch < 26)) return 1; // v1.5 until Feb 2023
  void ym;
  return 2; // v2 mini
};

// Elements → state at baseEpoch (circular orbit + J2 secular drift).
const sats = [];
for (const s of gp) {
  const n = (s.MEAN_MOTION * 2 * Math.PI) / 86400; // rad/s
  const a = Math.cbrt(MU / (n * n)); // km
  const alt = a - RE;
  if (alt < 150 || alt > 2000) continue; // re-entering or junk
  const inc = s.INCLINATION * D2R;
  const p = (RE / a) ** 2;
  const raanDot = -1.5 * n * J2 * p * Math.cos(inc);
  const argpDot = 0.75 * n * J2 * p * (5 * Math.cos(inc) ** 2 - 1);
  const dt = (baseEpoch - Date.parse(s.EPOCH + 'Z')) / 1000;
  const raan = (s.RA_OF_ASC_NODE * D2R + raanDot * dt) % (2 * Math.PI);
  const u = ((s.ARG_OF_PERICENTER + s.MEAN_ANOMALY) * D2R + (n + argpDot) * dt) % (2 * Math.PI);
  sats.push({ id: s.NORAD_CAT_ID, name: s.OBJECT_NAME, v: version(s.OBJECT_ID), a, inc, raan, u, n: n + argpDot, raanDot, alt });
}

const r5 = (x) => +x.toFixed(5);
const out = {
  generatedAt: new Date().toISOString(),
  source: 'CelesTrak GP (celestrak.org), group "starlink"',
  epoch: new Date(baseEpoch).toISOString(),
  // per satellite: [noradId, version 0=v1.0 1=v1.5 2=v2mini, a km, inc rad, raan rad, u rad, n rad/s, raanDot rad/s]
  sats: sats.map((s) => [s.id, s.v, +s.a.toFixed(1), r5(s.inc), r5(s.raan), r5(s.u), +s.n.toPrecision(9), +s.raanDot.toPrecision(5)])
};
await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out));
const byV = [0, 0, 0];
sats.forEach((s) => byV[s.v]++);
console.log(`starlink.json: ${sats.length} satellites (v1.0 ${byV[0]}, v1.5 ${byV[1]}, v2mini ${byV[2]}), epoch ${out.epoch}`);
