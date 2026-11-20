#!/usr/bin/env node
// Builds public/data/cables.json: submarine cable routes and landing points,
// lightly simplified, for drawing and for fibre routing.
//
//   node scripts/build-cables.mjs
//
// Source: TeleGeography's Submarine Cable Map (submarinecablemap.com).
// License: their old public data repo was CC BY-NC-SA 3.0 (non-commercial,
// attribution, share-alike); current terms aren't published. Credit is shown
// on the site. Confirm with TeleGeography before any public launch.

import { writeFile, mkdir } from 'node:fs/promises';

const BASE = 'https://www.submarinecablemap.com/api/v3';
const OUT = new URL('../public/data/cables.json', import.meta.url);

const get = async (path) => {
  const r = await fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
};

const [cables, landings] = await Promise.all([get('cable/cable-geo.json'), get('landing-point/landing-point-geo.json')]);

const R = 6371;
const D2R = Math.PI / 180;
const km = ([lon1, lat1], [lon2, lat2]) => {
  const dLat = (lat2 - lat1) * D2R, dLon = (lon2 - lon1) * D2R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Drop points closer than ~20 km to the previous kept one (keeps shape, halves size).
const simplify = (line) => {
  const out = [line[0]];
  for (let i = 1; i < line.length - 1; i++) if (km(out[out.length - 1], line[i]) > 20) out.push(line[i]);
  if (line.length > 1) out.push(line[line.length - 1]);
  return out;
};
const r3 = (x) => +x.toFixed(3);

let totalKm = 0;
const lines = [];
for (const f of cables.features) {
  for (const line of f.geometry.coordinates) {
    if (line.length < 2) continue;
    const s = simplify(line);
    for (let i = 1; i < s.length; i++) totalKm += km(s[i - 1], s[i]);
    lines.push({ c: f.properties.id, p: s.map(([lon, lat]) => [r3(lon), r3(lat)]) });
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  source: 'TeleGeography Submarine Cable Map (submarinecablemap.com)',
  cables: Object.fromEntries(cables.features.map((f) => [f.properties.id, f.properties.name])),
  // each line: [cableId, [[lon, lat], ...]]
  lines: lines.map((l) => [l.c, l.p]),
  // each landing: [lon, lat, name]
  landings: landings.features
    .filter((f) => !f.properties.is_tbd)
    .map((f) => [r3(f.geometry.coordinates[0]), r3(f.geometry.coordinates[1]), f.properties.name])
};
await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out));
console.log(
  `cables.json: ${Object.keys(out.cables).length} cables, ${lines.length} segments, ` +
    `${lines.reduce((s, l) => s + l.p.length, 0)} points, ${out.landings.length} landings, ~${Math.round(totalKm / 1000)}k km`
);
