import * as THREE from 'three';
import { METRE } from '@/lib/chase-camera';
import { DOOR_OPEN_S, STAGING_S } from '@/lib/missions/starship';
import { SLOT_Y } from '@/lib/models/starship-models';

/** What the chase camera frames: up (away from the Earth), the direction of travel, the point it looks at, from how far (m). */
export interface ChaseFrame {
  up: THREE.Vector3;
  fwd: THREE.Vector3;
  centre: THREE.Vector3;
  distM: number;
  /** Letting the satellites out (from 30 s before the door opens). */
  releasing: boolean;
}

export const newChaseFrame = (): ChaseFrame => ({ up: new THREE.Vector3(), fwd: new THREE.Vector3(), centre: new THREE.Vector3(), distM: 0, releasing: false });

const axis = new THREE.Vector3();
const side = new THREE.Vector3();

/**
 * The chase camera's framing at mission time `t`, for the ship whose root (its
 * base, scene units) is at `shipPos`, turned by `shipQuat`. Everything comes
 * from the ship itself, so the first frame of a launch is framed right too.
 */
export function chaseFrame(t: number, shipPos: THREE.Vector3, shipQuat: THREE.Quaternion, out: ChaseFrame): ChaseFrame {
  const up = out.up.copy(shipPos).normalize();
  // Travel direction: the ship's nose in flight, then east along the orbit.
  // Standing straight up on the pad, the nose gives none: the body's -Z there
  // points downrange, where the nose tips as it climbs, so the view doesn't swing.
  out.fwd.set(0, 1, 0).applyQuaternion(shipQuat);
  out.fwd.addScaledVector(up, -out.fwd.dot(up));
  if (out.fwd.lengthSq() < 1e-6) out.fwd.set(0, 0, -1).applyQuaternion(shipQuat);
  out.fwd.normalize();
  out.releasing = t > DOOR_OPEN_S - 30;
  axis.set(0, 1, 0).applyQuaternion(shipQuat);
  // Look at the middle of the stack, then of the ship; while releasing, at
  // the slot and the line of satellites rising from it.
  if (t < STAGING_S) out.centre.copy(shipPos).addScaledVector(axis, -10 * METRE);
  else out.centre.copy(shipPos).addScaledVector(axis, (out.releasing ? SLOT_Y - 4 : 26) * METRE);
  if (out.releasing) out.centre.addScaledVector(side.set(0, 0, 1).applyQuaternion(shipQuat), 45 * METRE);
  out.distM = t < STAGING_S ? 330 : out.releasing ? 170 : 220;
  return out;
}
