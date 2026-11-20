// Laser links between Starlink satellites, worked out from where they are
// right now. SpaceX doesn't publish the link graph, so this is the usual
// "+grid" approximation: each laser-carrying satellite links to the nearest
// satellite ahead of it, behind it, and on either side, among those flying
// the same way and within laser range.
//
// "Flying the same way" matters: satellites on crossing orbits pass each
// other at up to 15 km/s and can't hold a link, and a pair that is close now
// is on opposite sides of the Earth a few minutes later. That is also why the
// links can't be worked out once and stored: they are rebuilt as the
// satellites move (see currentLinks in lib/constellation).

/** Longest laser link drawn or routed over, km. In-plane neighbours sit up to ~2,000 km apart. */
export const MAX_LASER_KM = 2600;
/** Two satellites fly "the same way" when their directions of travel are within 25°. */
const CO_MOVING = Math.cos((25 * Math.PI) / 180);

/** Most satellites find all four neighbours this close; only the rest are searched to full range. */
const NEAR_KM = 1300;

/** Satellites bucketed into cubes `cellKm` wide, so neighbours within 2 cells are found without scanning everything. */
function bucket(pos: ArrayLike<number>, eligible: ArrayLike<number>, count: number, lo: number, hi: number, cellKm: number) {
  const n = eligible.length;
  const size = Math.floor((hi - lo) / cellKm) + 1;
  const cell = (v: number) => Math.floor((v - lo) / cellKm);
  const starts = new Int32Array(size * size * size + 1);
  const cellOf = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    if (!eligible[i]) continue;
    cellOf[i] = cell(pos[i * 3]) + size * (cell(pos[i * 3 + 1]) + size * cell(pos[i * 3 + 2]));
    starts[cellOf[i] + 1]++;
  }
  for (let c = 0; c < starts.length - 1; c++) starts[c + 1] += starts[c];
  const cursor = starts.slice(0, -1);
  const items = new Int32Array(count);
  for (let i = 0; i < n; i++) if (eligible[i]) items[cursor[cellOf[i]]++] = i;
  return { size, cell, starts, items };
}

/**
 * The link search as a job that can be worked through a slice at a time, so a
 * rebuild (tens of milliseconds for the whole constellation) never holds up a frame.
 *
 * @param pos      packed xyz of every satellite, km, in a non-rotating frame
 * @param dir      packed unit direction of travel of every satellite, same frame
 * @param eligible 1 where the satellite carries lasers and is in service
 */
export function laserLinkJob(pos: ArrayLike<number>, dir: ArrayLike<number>, eligible: ArrayLike<number>) {
  const n = eligible.length;
  let lo = Infinity, hi = -Infinity, count = 0;
  for (let i = 0; i < n; i++) {
    if (!eligible[i]) continue;
    count++;
    for (let k = 0; k < 3; k++) {
      const v = pos[i * 3 + k];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  const empty = count < 2;

  // A cube grid half the search range wide: everything in range is within two cells.
  const near = empty ? null : bucket(pos, eligible, count, lo, hi, NEAR_KM / 2);
  const far = empty ? null : bucket(pos, eligible, count, lo, hi, MAX_LASER_KM / 2);

  const keys = new Float64Array(count * 4);
  let found = 0;
  const pick = [-1, -1, -1, -1];
  const best = [0, 0, 0, 0];
  let next = 0;

  const linkOne = (i: number) => {
    const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2];
    const vx = dir[i * 3], vy = dir[i * 3 + 1], vz = dir[i * 3 + 2];
    // "Sideways": at right angles to both straight up and the direction of travel.
    let sx = py * vz - pz * vy, sy = pz * vx - px * vz, sz = px * vy - py * vx;
    const sl = Math.hypot(sx, sy, sz) || 1;
    sx /= sl;
    sy /= sl;
    sz /= sl;

    // The nearest co-moving satellite ahead, behind, to the left and to the right.
    const search = (grid: NonNullable<typeof near>, rangeKm: number) => {
      const max2 = rangeKm * rangeKm;
      pick.fill(-1);
      best.fill(max2);
      const { size, cell, starts, items } = grid;
      const cx = cell(px), cy = cell(py), cz = cell(pz);
      for (let z = Math.max(0, cz - 2); z <= Math.min(size - 1, cz + 2); z++) {
        for (let y = Math.max(0, cy - 2); y <= Math.min(size - 1, cy + 2); y++) {
          for (let x = Math.max(0, cx - 2); x <= Math.min(size - 1, cx + 2); x++) {
            const c = x + size * (y + size * z);
            for (let k = starts[c]; k < starts[c + 1]; k++) {
              const j = items[k];
              if (j === i) continue;
              const dx = pos[j * 3] - px, dy = pos[j * 3 + 1] - py, dz = pos[j * 3 + 2] - pz;
              const d2 = dx * dx + dy * dy + dz * dz;
              if (d2 >= max2) continue;
              if (vx * dir[j * 3] + vy * dir[j * 3 + 1] + vz * dir[j * 3 + 2] < CO_MOVING) continue;
              const along = dx * vx + dy * vy + dz * vz;
              const side = dx * sx + dy * sy + dz * sz;
              const q = Math.abs(along) >= Math.abs(side) ? (along > 0 ? 0 : 1) : side > 0 ? 2 : 3;
              if (d2 < best[q]) {
                best[q] = d2;
                pick[q] = j;
              }
            }
          }
        }
      }
    };
    search(near!, NEAR_KM);
    if (pick.includes(-1)) search(far!, MAX_LASER_KM);

    for (let q = 0; q < 4; q++) {
      const j = pick[q];
      if (j >= 0) keys[found++] = i < j ? i * n + j : j * n + i;
    }
  };

  return {
    /** Works through up to `satellites` more of them. True once all are done. */
    step(satellites: number): boolean {
      if (empty) return true;
      const end = Math.min(n, next + satellites);
      for (; next < end; next++) if (eligible[next]) linkOne(next);
      return next >= n;
    },
    /** Packed index pairs (a0, b0, a1, b1, …), each pair once, a < b. Call when step() has returned true. */
    result(): Uint32Array {
      // A link picked from both ends appears twice: sort, then keep each once.
      const sorted = keys.subarray(0, found).sort();
      const out = new Uint32Array(found * 2);
      let m = 0;
      for (let k = 0; k < found; k++) {
        if (k > 0 && sorted[k] === sorted[k - 1]) continue;
        const a = Math.floor(sorted[k] / n);
        out[m++] = a;
        out[m++] = sorted[k] - a * n;
      }
      return out.slice(0, m);
    }
  };
}

/** All the links at once. See laserLinkJob for the arguments. */
export function buildLaserLinks(pos: ArrayLike<number>, dir: ArrayLike<number>, eligible: ArrayLike<number>): Uint32Array {
  const job = laserLinkJob(pos, dir, eligible);
  job.step(Infinity);
  return job.result();
}
