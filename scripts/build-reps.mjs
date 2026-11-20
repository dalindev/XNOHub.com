#!/usr/bin/env node
// Builds public/data/reps.json: who the Nano representatives are, how much
// weight each holds right now, and where their node is.
//
//   node scripts/build-reps.mjs
//
// Sources (both public, no key):
//   - nano.community/api/representatives (MIT, by mistakia): alias, last seen,
//     node location from its IP.
//   - confirmation_quorum on a public RPC: which reps are online and their
//     weight. A rep online in the quorum but unknown to nano.community is kept
//     with no location (listed, not drawn).
// Run it by hand or from CI every ~12 h. Writes nothing if a source fails.

import { writeFile, mkdir } from 'node:fs/promises';

const RPCS = ['https://rpc.nano.to', 'https://node.somenano.com/proxy'];
const REPS_URL = 'https://nano.community/api/representatives';
const OUT = new URL('../public/data/reps.json', import.meta.url);
const RAW_PER_NANO = 10n ** 30n;
const PRINCIPAL_SHARE = 0.001; // 0.1% of online weight

const getJson = async (url, init) => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};

async function quorum() {
  for (const url of RPCS) {
    try {
      const q = await getJson(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'confirmation_quorum', peer_details: 'true' })
      });
      if (Array.isArray(q.peers) && q.online_stake_total) return { ...q, source: url };
    } catch (e) {
      console.warn(`quorum from ${url} failed: ${e.message}`);
    }
  }
  throw new Error('no RPC returned confirmation_quorum');
}

const toNano = (raw) => Number(BigInt(raw) / RAW_PER_NANO);

const [community, q] = await Promise.all([getJson(REPS_URL), quorum()]);
const onlineTotal = toNano(q.online_stake_total);
const online = new Map();
for (const p of q.peers) online.set(p.account, toNano(p.weight)); // a rep may list several peers

const byAccount = new Map();
for (const r of community) {
  const lat = Number(r.network?.lat);
  const lon = Number(r.network?.lon);
  const hasLoc = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
  const weight = online.get(r.account) ?? Number(r.account_meta?.weight ?? 0) / 1e30;
  byAccount.set(r.account, {
    account: r.account,
    alias: r.alias || null,
    weight: Math.round(weight),
    online: online.has(r.account),
    lat: hasLoc ? +lat.toFixed(3) : null,
    lon: hasLoc ? +lon.toFixed(3) : null,
    city: r.network?.city || null,
    country: r.network?.countryCode || null,
    version: r.telemetry
      ? `${r.telemetry.major_version}.${r.telemetry.minor_version}`
      : null,
    lastSeen: r.last_seen ?? null
  });
}
for (const [account, weight] of online) {
  if (!byAccount.has(account)) {
    byAccount.set(account, {
      account, alias: null, weight: Math.round(weight), online: true,
      lat: null, lon: null, city: null, country: null, version: null, lastSeen: null
    });
  }
}

const reps = [...byAccount.values()]
  .map((r) => ({
    ...r,
    weightPercent: onlineTotal > 0 ? +((r.weight / onlineTotal) * 100).toFixed(4) : 0,
    principal: r.online && r.weight >= onlineTotal * PRINCIPAL_SHARE
  }))
  .sort((a, b) => b.weight - a.weight);

const out = {
  generatedAt: new Date().toISOString(),
  sources: { reps: REPS_URL, quorum: q.source },
  onlineWeight: Math.round(onlineTotal),
  reps
};

await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out, null, 1) + '\n');
const located = reps.filter((r) => r.lat !== null);
const onlineLocated = located.filter((r) => r.online);
const coveredWeight = onlineLocated.reduce((s, r) => s + r.weight, 0);
console.log(
  `reps.json: ${reps.length} reps, ${reps.filter((r) => r.online).length} online, ` +
    `${reps.filter((r) => r.principal).length} principal, ${located.length} with location; ` +
    `drawn online reps hold ${((coveredWeight / onlineTotal) * 100).toFixed(1)}% of online weight`
);
