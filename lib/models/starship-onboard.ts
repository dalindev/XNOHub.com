import * as THREE from 'three';
import { R, SLOT_Y, SLOT_H, SLOT_HALF_ANGLE, shipRadius } from '@/lib/models/starship-models';
import { metreUVs, textureSize, vehicleMaterials } from '@/lib/models/vehicle-materials';
import { STACK_Z } from '@/lib/missions/starship';

// Starship's onboard cameras and the payload bay they look into.
//
// The mounts follow Ring Watchers' survey of the flight cameras
// (ringwatchers.com/article/starship-onboard-cams):
//  - ship forward flap: under the left forward flap, looking down the hull;
//  - ship outward: on the hull, looking out (plasma, Starlink deploys);
//  - payload door: inside the bay, watching the door and the satellites
//    leave (seen on Flights 3 and 10; Ring Watchers puts it on top of the
//    dispenser; ours is on the bay wall beside the stack, where our shorter
//    bay leaves room);
//  - booster chine: on a chine, looking up at the grid fins and the ship.
// Exact positions and lenses aren't published: the mounts follow photos, the
// lenses are wide like the webcast views.
//
// Inside, the bay is dark, closed but for the slot. The engineering cameras
// inside the tanks carry their own lights; we give the dispenser's camera two
// lamps too (that part is our assumption). The bay's walls take no sunlight,
// only the lamps (and a little ambient).

export type OnboardCamId = 'flap' | 'bay' | 'side' | 'booster';

export interface OnboardCam {
  id: OnboardCamId;
  label: string;
  vehicle: 'ship' | 'booster';
  /** Mount, the point it looks at, and its up, in the vehicle's frame (metres, +Y to the nose, +Z the slot side). */
  pos: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
  /** Vertical field of view, degrees. */
  fov: number;
}

const DEG = Math.PI / 180;
/** A point `r` from the axis at `y`, `deg` round from +Z toward +X (the models' convention). */
const at = (deg: number, r: number, y: number) => new THREE.Vector3(Math.sin(deg * DEG) * r, y, Math.cos(deg * DEG) * r);
const radial = (deg: number) => at(deg, 1, 0);

const BAY_FLOOR = SLOT_Y - 2.2;
const BAY_TOP = 49.5;
const RAIL_X = 3.45;

export const ONBOARD_CAMS: OnboardCam[] = [
  {
    id: 'flap',
    label: 'Flap',
    vehicle: 'ship',
    // Under the left forward flap, near its root, looking down the hull past the aft flap.
    pos: at(-72, R + 1.0, 37.05),
    target: at(-86, R + 0.9, 4),
    up: new THREE.Vector3(0, 0, 1),
    fov: 78
  },
  {
    id: 'bay',
    label: 'Bay',
    vehicle: 'ship',
    // On the bay wall beside the stack, at the slot's height, looking across the satellite's front and out of the door.
    pos: new THREE.Vector3(-3.7, SLOT_Y + 0.3, 2.3),
    target: new THREE.Vector3(0.5, SLOT_Y, R + 1.0),
    up: new THREE.Vector3(0, 1, 0),
    fov: 80
  },
  {
    id: 'side',
    label: 'Outward',
    vehicle: 'ship',
    // On the hull below the slot, looking out along the line the satellites leave on.
    pos: at(24, R + 0.16, SLOT_Y - 3.2),
    target: new THREE.Vector3(0, SLOT_Y + 9, R + 40),
    up: new THREE.Vector3(0, 1, 0),
    fov: 70
  },
  {
    id: 'booster',
    label: 'Booster',
    vehicle: 'booster',
    // Low on a chine, looking up the booster at its grid fins and the ship above.
    pos: at(90, R + 0.62, 12),
    target: at(92, R + 0.1, 72),
    up: radial(90),
    fov: 74
  }
];

export const onboardCam = (id: OnboardCamId) => ONBOARD_CAMS.find((c) => c.id === id)!;

const eye = new THREE.Vector3();
const look = new THREE.Vector3();

/** Put `camera` on `mount`, carried by `vehicle` (whose children are in metres). */
export function placeOnboardCamera(camera: THREE.PerspectiveCamera, vehicle: THREE.Object3D, mount: OnboardCam) {
  vehicle.updateMatrixWorld();
  eye.copy(mount.pos).applyMatrix4(vehicle.matrixWorld);
  look.copy(mount.target).applyMatrix4(vehicle.matrixWorld);
  camera.position.copy(eye);
  camera.up.copy(mount.up).transformDirection(vehicle.matrixWorld);
  camera.lookAt(look);
}

/** Faces turned to point inward (winding and normals), for walls seen from inside. */
function inward(g: THREE.BufferGeometry) {
  const index = g.getIndex();
  if (index) {
    const a = index.array;
    for (let i = 0; i < a.length; i += 3) [a[i + 1], a[i + 2]] = [a[i + 2], a[i + 1]];
    index.needsUpdate = true;
  }
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

/** A material that takes no sunlight: the bay is closed but for the slot. */
function shaded(params: THREE.MeshStandardMaterialParameters) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      THREE.ShaderChunk.lights_fragment_begin.replace(
        'getDirectionalLightInfo( directionalLight, directLight );',
        'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= 0.0;'
      )
    );
  };
  return m;
}

export interface PayloadBay {
  group: THREE.Group;
  /** Lamp positions, ship frame (metres). */
  lamps: THREE.Vector3[];
  /** The lamps' glowing faces: brightness follows the lamps. */
  glow: THREE.MeshBasicMaterial;
}

/** The inside of the payload bay: walls with the slot cut in, floor, the dispenser's rails, the camera and its lamps. Ship frame, metres. */
export function buildPayloadBay(): PayloadBay {
  const steelSize = textureSize('steel');
  const wallR = (y: number) => Math.max(shipRadius(y) - 0.07, 0.05);
  const lathe = (y0: number, y1: number, n: number, phiStart: number, phiLength: number) => {
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const y = y0 + ((y1 - y0) * i) / n;
      return new THREE.Vector2(wallR(y), y);
    });
    return inward(metreUVs(new THREE.LatheGeometry(pts, 48, phiStart, phiLength), steelSize, phiLength * R));
  };
  const lo = SLOT_Y - SLOT_H / 2, hi = SLOT_Y + SLOT_H / 2, s = SLOT_HALF_ANGLE;
  const walls = [
    lathe(BAY_FLOOR, lo, 1, 0, Math.PI * 2),
    lathe(lo, hi, 1, s, Math.PI * 2 - 2 * s), // the slot is open
    lathe(hi, BAY_TOP, 16, 0, Math.PI * 2)
  ];
  // Mostly matte: with nothing round it to reflect, bare metal would look black.
  const wall = shaded({ color: 0xb4b8be, metalness: 0.2, roughness: 0.55, map: vehicleMaterials().steel.map ?? null });
  const dark = shaded({ color: 0x3a3c40, metalness: 0.15, roughness: 0.75 });
  const frame = shaded({ color: 0x8a8e95, metalness: 0.25, roughness: 0.5 });

  const group = new THREE.Group();
  group.name = 'payload-bay';
  for (const g of walls) group.add(new THREE.Mesh(g, wall));
  // The floor: the top of the tanks below.
  group.add(new THREE.Mesh(new THREE.CircleGeometry(R - 0.07, 48).rotateX(-Math.PI / 2).translate(0, BAY_FLOOR, 0), dark));
  // The dispenser: two rails either side of the stack, a cross-beam on top carrying the camera.
  const railH = 6.2;
  for (const x of [RAIL_X, -RAIL_X]) {
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, railH, 0.4).translate(x, SLOT_Y - 0.9 + railH / 2, STACK_Z), frame));
  }
  // The camera's housing, on the wall just behind its lens.
  const cam = ONBOARD_CAMS.find((c) => c.id === 'bay')!;
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.22).translate(cam.pos.x - 0.2, cam.pos.y, cam.pos.z), dark));

  // Two lamps on the wall either side above the door, shining down on the slot.
  const lamps = [new THREE.Vector3(-1.1, SLOT_Y + 2.1, 4.15), new THREE.Vector3(1.1, SLOT_Y + 2.1, 4.15)];
  const glow = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  for (const p of lamps) {
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.22).translate(p.x, p.y + 0.06, p.z), dark));
    group.add(new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16).rotateX(Math.PI / 2).translate(p.x, p.y, p.z), glow));
  }
  return { group, lamps, glow };
}
