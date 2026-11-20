#!/usr/bin/env node
// Builds public/sky/stars.bin: every naked-eye star (to magnitude 6.5) from
// the Yale Bright Star Catalogue, 5th revised edition (Hoffleit & Warren 1991).
//
//   node scripts/build-stars.mjs                 # downloads ~0.6 MB
//   BSC5_FILE=/path/bsc5.dat.gz node scripts/build-stars.mjs
//
// Output: little-endian Int16, four values per star:
//   RA   (J2000)  degrees × 32768 / 180 - 32768   (0..360° → -32768..32767)
//   Dec  (J2000)  degrees × 32767 / 90
//   V magnitude   × 1000
//   B-V colour    × 1000
// Sorted brightest first. Also prints the named stars used for sky labels
// (lib/sky/named-stars.ts) after checking each against its known position.
//
// The Milky Way picture next to it (public/sky/milkyway-1k.jpg) is the 1024 px
// preview of NASA SVS "Deep Star Maps 2020" (milkyway_2020_4k_print.jpg,
// svs.gsfc.nasa.gov/4851; credit NASA/Goddard Space Flight Center Scientific
// Visualization Studio, Gaia DR2: ESA/Gaia/DPAC). Sharper versions exist there
// as EXR files (36 MB for 4K) if the glow ever needs more detail.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const SOURCE = 'http://tdc-www.harvard.edu/catalogs/bsc5.dat.gz';
const OUT = new URL('../public/sky/stars.bin', import.meta.url);

let gz;
if (process.env.BSC5_FILE) {
  gz = await readFile(process.env.BSC5_FILE);
} else {
  const r = await fetch(SOURCE, { signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`bsc5.dat.gz: HTTP ${r.status}`);
  gz = Buffer.from(await r.arrayBuffer());
}
const text = (gz[0] === 0x1f && gz[1] === 0x8b ? gunzipSync(gz) : gz).toString('latin1');

// Fixed-width columns (1-based, from the catalogue's ReadMe):
//   1-4 HR · 76-83 RA h m s · 84-90 Dec ±d m s · 103-107 Vmag · 110-114 B-V
const num = (line, from, to) => {
  const s = line.slice(from - 1, to).trim();
  return s === '' ? NaN : Number(s);
};

const stars = [];
for (const line of text.split('\n')) {
  if (line.length < 107) continue;
  const hr = num(line, 1, 4);
  const rah = num(line, 76, 77), ram = num(line, 78, 79), ras = num(line, 80, 83);
  const sign = line[83] === '-' ? -1 : 1;
  const ded = num(line, 85, 86), dem = num(line, 87, 88), des = num(line, 89, 90);
  const mag = num(line, 103, 107);
  if (![rah, ram, ras, ded, dem, des, mag].every(Number.isFinite)) continue; // novae and other non-stars have no position
  const bv = num(line, 110, 114);
  stars.push({
    hr,
    ra: (rah + ram / 60 + ras / 3600) * 15,
    dec: sign * (ded + dem / 60 + des / 3600),
    mag,
    bv: Number.isFinite(bv) ? bv : 0.6 // unknown colour: sun-like
  });
}
if (stars.length < 9000) throw new Error(`Only ${stars.length} stars parsed; the file format may have changed`);

// Names for sky labels, each checked against the position we expect (±0.5°)
// so a wrong catalogue number can't put a label on the wrong star.
const NAMED = [
  ['Sirius', 2491, 101.29, -16.72],
  ['Canopus', 2326, 95.99, -52.7],
  ['Arcturus', 5340, 213.92, 19.18],
  ['Alpha Centauri', 5459, 219.9, -60.83],
  ['Vega', 7001, 279.23, 38.78],
  ['Capella', 1708, 79.17, 46.0],
  ['Rigel', 1713, 78.63, -8.2],
  ['Procyon', 2943, 114.83, 5.22],
  ['Betelgeuse', 2061, 88.79, 7.41],
  ['Achernar', 472, 24.43, -57.24],
  ['Altair', 7557, 297.7, 8.87],
  ['Aldebaran', 1457, 68.98, 16.51],
  ['Antares', 6134, 247.35, -26.43],
  ['Spica', 5056, 201.3, -11.16],
  ['Pollux', 2990, 116.33, 28.03],
  ['Fomalhaut', 8728, 344.41, -29.62],
  ['Deneb', 7924, 310.36, 45.28],
  ['Polaris', 424, 37.95, 89.26]
];
const byHr = new Map(stars.map((s) => [s.hr, s]));
const named = NAMED.map(([name, hr, ra, dec]) => {
  const s = byHr.get(hr);
  if (!s) throw new Error(`${name}: HR ${hr} not in the catalogue`);
  const dRa = Math.abs(((s.ra - ra + 540) % 360) - 180) * Math.cos((dec * Math.PI) / 180);
  if (dRa > 0.5 || Math.abs(s.dec - dec) > 0.5) {
    throw new Error(`${name}: HR ${hr} is at ${s.ra.toFixed(2)}, ${s.dec.toFixed(2)}, expected ${ra}, ${dec}`);
  }
  return { name, ra: +s.ra.toFixed(4), dec: +s.dec.toFixed(4), mag: s.mag };
});
const sirius = byHr.get(2491);
if (Math.abs(sirius.mag + 1.46) > 0.02) throw new Error(`Sirius magnitude parsed as ${sirius.mag}`);

stars.sort((a, b) => a.mag - b.mag);
const out = new Int16Array(stars.length * 4);
stars.forEach((s, i) => {
  out[i * 4] = Math.round((s.ra * 32768) / 180) - 32768;
  out[i * 4 + 1] = Math.round((s.dec * 32767) / 90);
  out[i * 4 + 2] = Math.round(s.mag * 1000);
  out[i * 4 + 3] = Math.round(Math.max(-0.5, Math.min(2.5, s.bv)) * 1000);
});
await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, Buffer.from(out.buffer));

console.log(`${stars.length} stars, magnitude ${stars[0].mag} to ${stars[stars.length - 1].mag}, ${(out.byteLength / 1024).toFixed(0)} KB`);
console.log('Named stars (paste into lib/sky/named-stars.ts if they change):');
console.log(JSON.stringify(named));
