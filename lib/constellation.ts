import * as THREE from 'three';
import { eciAt, eciToScene, type SatRow } from '@/lib/orbits';

// The live constellation state shared by the renderer (writer) and the
// routing code (reader). Rows are re-based in place by StarlinkConstellation.

export const constellation = {
  rows: [] as SatRow[],
  links: [] as [number, number][],
  /** Sim time (ms) the rows' angles refer to. */
  epochMs: 0,
  /** Seconds since epochMs at the last frame. */
  dt: 0,
  /** Greenwich sidereal angle (rad) at the last frame. */
  gst: 0
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
