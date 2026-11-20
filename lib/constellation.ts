import * as THREE from 'three';
import { eciAt, eciDirAt, eciToScene, hasLasers, type SatRow } from '@/lib/orbits';
import { buildLaserLinks, laserLinkJob } from '@/lib/routing/laser-links';

// The live constellation state shared by the renderer (writer) and the
// routing code (reader). Rows are re-based in place by StarlinkConstellation.

export const constellation = {
  rows: [] as SatRow[],
  /** Sim time (ms) the rows' angles refer to. */
  epochMs: 0,
  /** Seconds since epochMs at the last frame. */
  dt: 0,
  /** Greenwich sidereal angle (rad) at the last frame. */
  gst: 0,
  /** Laser links as packed index pairs. Read them through currentLinks(). */
  links: new Uint32Array(0) as Uint32Array,
  /** Goes up each time the links are rebuilt. */
  linksVersion: 0
};

const tmp = [0, 0, 0];

/** Scene position of satellite i right now (as of the last frame). */
export function satScene(i: number, out = new THREE.Vector3()) {
  eciAt(constellation.rows[i], constellation.dt, tmp);
  return eciToScene(tmp[0], tmp[1], tmp[2], constellation.gst, out);
}

/** Scene positions of every satellite right now, packed xyz. */
export function allSatScene(out?: Float32Array) {
  const n = constellation.rows.length;
  const arr = out && out.length === n * 3 ? out : new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    satScene(i, v);
    arr[i * 3] = v.x;
    arr[i * 3 + 1] = v.y;
    arr[i * 3 + 2] = v.z;
  }
  return arr;
}

/** Where every satellite is `dt` seconds after the rows' epoch: positions (km), directions of travel, and who carries lasers. */
function linkInputs(rows: SatRow[], dt: number) {
  const n = rows.length;
  const pos = new Float32Array(n * 3), dir = new Float32Array(n * 3), eligible = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    eciAt(rows[i], dt, pos, i * 3);
    eciDirAt(rows[i], dt, dir, i * 3);
    eligible[i] = hasLasers(rows[i]) ? 1 : 0;
  }
  return [pos, dir, eligible] as const;
}

/** Laser links for a set of satellites `dt` seconds after their epoch. */
export function laserLinksAt(rows: SatRow[], dt: number): Uint32Array {
  return buildLaserLinks(...linkInputs(rows, dt));
}

// Links hold for minutes, not hours (neighbours to either side swap as the
// orbits converge toward the poles), so they are rebuilt once a minute of sim
// time, and only while something is using them. A rebuild is tens of
// milliseconds of work, so after the first one it is spread over a few frames
// (refreshLinks). Under time warp rebuilds are held to one a second; links
// that go stale in between are dropped by the router rather than followed
// (see SpaceNetwork).
const LINKS_EVERY_MS = 60_000;
const LINKS_MIN_WALL_MS = 1000;
const SATS_PER_FRAME = 600; // ~3 ms a frame, the whole constellation in ~20 frames
const IN_USE_FOR_MS = 90_000;
let built = { rows: null as SatRow[] | null, sim: NaN, wall: -Infinity };
let job: { run: ReturnType<typeof laserLinkJob>; rows: SatRow[]; sim: number } | null = null;
let wantedAt = -Infinity;

const publish = (links: Uint32Array, rows: SatRow[], sim: number) => {
  constellation.links = links;
  constellation.linksVersion++;
  built = { rows, sim, wall: performance.now() };
  job = null;
};

/** The laser links for where the satellites are now (the newest finished set). Asking also keeps them refreshed. */
export function currentLinks(simMs: number): Uint32Array {
  wantedAt = performance.now();
  const { rows } = constellation;
  // First use: build them all at once (the viewer has just switched something on).
  if (rows.length && rows !== built.rows) publish(laserLinksAt(rows, constellation.dt), rows, simMs);
  return constellation.links;
}

/** Call once a frame: rebuilds the links a slice at a time while something is using them. */
export function refreshLinks(simMs: number) {
  const { rows } = constellation;
  const wall = performance.now();
  if (rows !== built.rows || wall - wantedAt > IN_USE_FOR_MS) return;
  if (job && job.rows !== rows) job = null;
  if (!job) {
    if (Math.abs(simMs - built.sim) < LINKS_EVERY_MS || wall - built.wall < LINKS_MIN_WALL_MS) return;
    job = { run: laserLinkJob(...linkInputs(rows, constellation.dt)), rows, sim: simMs };
    return;
  }
  if (job.run.step(SATS_PER_FRAME)) publish(job.run.result(), rows, job.sim);
}
