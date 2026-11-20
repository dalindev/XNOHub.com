#!/usr/bin/env node
// Builds public/data/cities.bin: every city of 15,000 people or more, for the
// night lights (components/city-lights.tsx).
//
//   node scripts/build-cities.mjs                 downloads the list (3.4 MB)
//   CITIES_FILE=cities15000.zip node scripts/build-cities.mjs
//
// Source: GeoNames (https://www.geonames.org), cities15000, CC BY 4.0.
// Kept per city: latitude, longitude, population and ground height, 8 bytes:
//   int16 lat (90° = 32767), int16 lon (180° = 32767),
//   uint16 population in thousands, int16 height in metres
// sorted largest first. Districts of a city (feature code PPLX) are skipped:
// their people are already counted in the city itself.

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ZIP = 'https://download.geonames.org/export/dump/cities15000.zip';
const OUT = new URL('../public/data/cities.bin', import.meta.url);

let file = process.env.CITIES_FILE;
if (!file) {
  const dir = await mkdtemp(join(tmpdir(), 'cities-'));
  file = join(dir, 'cities15000.zip');
  const res = await fetch(URL_ZIP);
  if (!res.ok) throw new Error(`GeoNames: HTTP ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}
const text = file.endsWith('.zip')
  ? execFileSync('unzip', ['-p', file, 'cities15000.txt'], { maxBuffer: 64 << 20 }).toString('utf8')
  : await readFile(file, 'utf8');

const cities = [];
for (const line of text.split('\n')) {
  const f = line.split('\t');
  if (f.length < 17 || f[7] === 'PPLX') continue;
  const lat = +f[4], lon = +f[5], pop = +f[14], height = +f[16] || +f[15] || 0;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !(pop >= 1000)) continue;
  cities.push({ name: f[2], lat, lon, pop, height });
}
cities.sort((a, b) => b.pop - a.pop);

// The list must be the real thing before it replaces the file.
const near = (name, lat, lon) => {
  const c = cities.find((c) => c.name === name);
  if (!c || Math.abs(c.lat - lat) > 0.5 || Math.abs(c.lon - lon) > 0.5) throw new Error(`${name} missing or misplaced`);
};
near('Tokyo', 35.69, 139.69);
near('New York City', 40.71, -74.01);
near('Sao Paulo', -23.55, -46.64);
if (cities.length < 20000) throw new Error(`only ${cities.length} cities`);

const buf = Buffer.alloc(cities.length * 8);
cities.forEach((c, i) => {
  buf.writeInt16LE(Math.round((c.lat / 90) * 32767), i * 8);
  buf.writeInt16LE(Math.round((c.lon / 180) * 32767), i * 8 + 2);
  buf.writeUInt16LE(Math.min(65535, Math.round(c.pop / 1000)), i * 8 + 4);
  buf.writeInt16LE(Math.max(-500, Math.min(9000, Math.round(c.height))), i * 8 + 6);
});
await writeFile(OUT, buf);
const people = cities.reduce((s, c) => s + c.pop, 0);
console.log(`cities.bin: ${cities.length} cities, ${(people / 1e9).toFixed(2)} billion people, largest ${cities[0].name} (${(cities[0].pop / 1e6).toFixed(1)} M), ${(buf.length / 1024).toFixed(0)} KB`);
