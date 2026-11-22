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
//   - telemetry on the same RPC: every live node that node can see (about 150),
//     most of which don't vote. They relay blocks and keep their own tally.
//   - ip-api.com (free for non-commercial use): the city of an IP address, for
//     the nodes nano.community has no place for. Nothing is guessed: a node
//     whose address can't be placed is listed without a place and not drawn.
//     Addresses are used to look the place up and are not written to the file.
// Run it by hand or from CI every ~12 h. Writes nothing if a source fails.

import { writeFile, mkdir } from 'node:fs/promises';

const RPCS = ['https://rpc.nano.to', 'https://node.somenano.com/proxy'];
const REPS_URL = 'https://nano.community/api/representatives';
const GEO_URL = 'http://ip-api.com/batch?fields=status,query,lat,lon,city,countryCode';
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

/** "[::ffff:1.2.3.4]:7075" or "::ffff:1.2.3.4" → "1.2.3.4"; plain IPv6 stays as it is. */
const bareIp = (address) => {
  let a = String(address ?? '').trim();
  const bracket = a.match(/^\[(.+)\](?::\d+)?$/);
  if (bracket) a = bracket[1];
  else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(a)) a = a.replace(/:\d+$/, '');
  return a.replace(/^::ffff:/i, '');
};

/** Every live node the RPC's node can see, voting or not. Empty if the RPC won't say. */
async function telemetry(url) {
  try {
    const t = await getJson(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'telemetry', raw: 'true' })
    });
    return Array.isArray(t.metrics) ? t.metrics : [];
  } catch (e) {
    console.warn(`telemetry from ${url} failed: ${e.message}`);
    return [];
  }
}

/** City-level place of each address, 100 per request. Addresses that can't be placed are left out. */
async function locate(ips) {
  const found = new Map();
  for (let i = 0; i < ips.length; i += 100) {
    try {
      const rows = await getJson(GEO_URL, { method: 'POST', body: JSON.stringify(ips.slice(i, i + 100)) });
      for (const r of rows) {
        if (r.status !== 'success' || !Number.isFinite(r.lat) || !Number.isFinite(r.lon) || (r.lat === 0 && r.lon === 0)) continue;
        found.set(r.query, { lat: +r.lat.toFixed(3), lon: +r.lon.toFixed(3), city: r.city || null, country: r.countryCode || null });
      }
    } catch (e) {
      console.warn(`locating addresses failed: ${e.message}`);
    }
  }
  return found;
}

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

// Places for what nano.community couldn't place: online reps by their peer address, and the nodes that don't vote.
const live = await telemetry(q.source);
const repIp = new Map(q.peers.map((p) => [p.account, bareIp(p.ip)]));
const repIps = new Set(repIp.values());
const others = live.map((m) => ({ ip: bareIp(m.address), version: `${m.major_version}.${m.minor_version}` })).filter((n) => n.ip && !repIps.has(n.ip));
const unplaced = [...byAccount.values()].filter((r) => r.online && r.lat === null && repIp.get(r.account));
const places = await locate([...new Set([...unplaced.map((r) => repIp.get(r.account)), ...others.map((n) => n.ip)])]);
for (const r of unplaced) Object.assign(r, places.get(repIp.get(r.account)) ?? {});
/** Live nodes that don't vote, where their place is known. */
const nodes = others.map((n) => ({ ...places.get(n.ip), version: n.version })).filter((n) => n.lat !== undefined);

const reps = [...byAccount.values()]
  .map((r) => ({
    ...r,
    weightPercent: onlineTotal > 0 ? +((r.weight / onlineTotal) * 100).toFixed(4) : 0,
    principal: r.online && r.weight >= onlineTotal * PRINCIPAL_SHARE
  }))
  .sort((a, b) => b.weight - a.weight);

const out = {
  generatedAt: new Date().toISOString(),
  sources: { reps: REPS_URL, quorum: q.source, places: 'https://ip-api.com' },
  /** Live nodes the RPC's node could see, voting or not. */
  liveNodes: live.length,
  onlineWeight: Math.round(onlineTotal),
  reps,
  nodes
};

await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out, null, 1) + '\n');
const located = reps.filter((r) => r.lat !== null);
const onlineLocated = located.filter((r) => r.online);
const coveredWeight = onlineLocated.reduce((s, r) => s + r.weight, 0);
console.log(
  `reps.json: ${reps.length} reps, ${reps.filter((r) => r.online).length} online, ` +
    `${reps.filter((r) => r.principal).length} principal, ${located.length} with location; ` +
    `drawn online reps hold ${((coveredWeight / onlineTotal) * 100).toFixed(1)}% of online weight; ` +
    `${live.length} live nodes seen, ${others.length} of them not voting, ${nodes.length} of those placed`
);
