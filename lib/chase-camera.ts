import * as THREE from 'three';

const M = 1 / 6_371_000; // scene units per metre
const off = new THREE.Vector3();
const side = new THREE.Vector3();

/**
 * Put the camera behind and a little above a target, slowly circling it so
 * the model is seen from different angles while the Earth turns below.
 * `up` is local vertical (away from Earth), `fwd` the direction of travel.
 */
export function chase(
  camera: THREE.Camera,
  target: THREE.Vector3,
  up: THREE.Vector3,
  fwd: THREE.Vector3,
  distM: number,
  azimuth: number,
  heightFrac = 0.3
) {
  side.crossVectors(up, fwd).normalize();
  off
    .copy(fwd)
    .multiplyScalar(-Math.cos(azimuth))
    .addScaledVector(side, Math.sin(azimuth))
    .normalize()
    .multiplyScalar(distM * M)
    .addScaledVector(up, distM * heightFrac * M);
  camera.position.copy(target).add(off);
  camera.up.copy(up);
  camera.lookAt(target);
}

export const METRE = M;
