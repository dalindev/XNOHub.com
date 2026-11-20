#!/usr/bin/env node
// Builds public/data/starlink.json: every Starlink in orbit, as compact mean
// elements, plus an approximate laser-link (ISL) neighbour list.
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
// Laser links are approximate: SpaceX doesn't publish the link graph. Each
// satellite above 400 km (except v1.0, which has no lasers) links to its two
// nearest neighbours in its own orbital plane and its two nearest in other
// planes of the same shell, the usual "+grid" pattern.

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

// Positions (inertial) at baseEpoch for neighbour search.
const pos = sats.map((s) => {
  const cu = Math.cos(s.u), su = Math.sin(s.u), cO = Math.cos(s.raan), sO = Math.sin(s.raan), ci = Math.cos(s.inc), si = Math.sin(s.inc);
  return [s.a * (cO * cu - sO * su * ci), s.a * (sO * cu + cO * su * ci), s.a * su * si];
});
const normal = sats.map((s) => [Math.sin(s.raan) * Math.sin(s.inc), -Math.cos(s.raan) * Math.sin(s.inc), Math.cos(s.inc)]);

// Spatial hash for nearest-neighbour search.
const CELL = 1500; // km
const key = (p) => `${Math.floor(p[0] / CELL)},${Math.floor(p[1] / CELL)},${Math.floor(p[2] / CELL)}`;
const grid = new Map();
sats.forEach((s, i) => {
  if (s.alt < 400 || s.v === 0) return;
  const k = key(pos[i]);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(i);
});
const links = new Set();
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
sats.forEach((s, i) => {
  if (s.alt < 400 || s.v === 0) return;
  const [cx, cy, cz] = pos[i].map((v) => Math.floor(v / CELL));
  const same = [], other = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    for (const j of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
      if (j === i) continue;
      const t = sats[j];
      if (Math.abs(t.alt - s.alt) > 40 || Math.abs(t.inc - s.inc) > 1.5 * D2R) continue; // same shell
      const d = dist2(pos[i], pos[j]);
      if (d > 2500 ** 2) continue; // lasers reach a few thousand km
      const dot = normal[i][0] * normal[j][0] + normal[i][1] * normal[j][1] + normal[i][2] * normal[j][2];
      (dot > Math.cos(1.5 * D2R) ? same : other).push([d, j]);
    }
  }
  for (const [, j] of [...same.sort((a, b) => a[0] - b[0]).slice(0, 2), ...other.sort((a, b) => a[0] - b[0]).slice(0, 2)]) {
    links.add(i < j ? `${i}:${j}` : `${j}:${i}`);
  }
});

// Shells would otherwise be separate islands. Starlink lasers can point at
// satellites in other shells, so give each satellite one link to its nearest
// neighbour in a different shell (within 1,500 km).
let crossShell = 0;
sats.forEach((s, i) => {
  if (s.alt < 400 || s.v === 0) return;
  const [cx, cy, cz] = pos[i].map((v) => Math.floor(v / CELL));
  let best = -1, bestD = 1500 ** 2;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    for (const j of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
      const t = sats[j];
      if (Math.abs(t.alt - s.alt) <= 40 && Math.abs(t.inc - s.inc) <= 1.5 * D2R) continue; // same shell
      const d = dist2(pos[i], pos[j]);
      if (d < bestD) { bestD = d; best = j; }
    }
  }
  if (best >= 0) {
    const k = i < best ? `${i}:${best}` : `${best}:${i}`;
    if (!links.has(k)) { links.add(k); crossShell++; }
  }
});

const r5 = (x) => +x.toFixed(5);
const out = {
  generatedAt: new Date().toISOString(),
  source: 'CelesTrak GP (celestrak.org), group "starlink"',
  epoch: new Date(baseEpoch).toISOString(),
  // per satellite: [noradId, version 0=v1.0 1=v1.5 2=v2mini, a km, inc rad, raan rad, u rad, n rad/s, raanDot rad/s]
  sats: sats.map((s) => [s.id, s.v, +s.a.toFixed(1), r5(s.inc), r5(s.raan), r5(s.u), +s.n.toPrecision(9), +s.raanDot.toPrecision(5)]),
  links: [...links].map((l) => l.split(':').map(Number))
};
await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out));
const byV = [0, 0, 0];
sats.forEach((s) => byV[s.v]++);
console.log(`starlink.json: ${sats.length} satellites (v1.0 ${byV[0]}, v1.5 ${byV[1]}, v2mini ${byV[2]}), ${links.size} laser links (${crossShell} cross-shell), epoch ${out.epoch}`);
