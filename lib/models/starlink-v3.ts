import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vehicleMaterials } from '@/lib/models/vehicle-materials';

// Starlink V3, after SpaceX's renders: a flat bus with bronze-coloured panels
// split by lighter ribs, phased-array antennas on the face toward the Earth,
// laser terminals, four backhaul dishes on arms at the corners, a thruster at
// the back, and two long, pale solar arrays held out on struts. SpaceX has
// published no dimensions; these are estimates that fit the renders and the
// ~2 t mass (bus about 6.2 by 3 m, arrays about 24 by 3 m each, ~55 m span).
//
// Folded for launch, each array is a stack of panels lying on half of the bus
// top, so a satellite is a flat slab that fits through Starship's payload
// slot. Unfolding: each stack swings up and out on its hinge, struts push it
// clear of the bus, then the panels open out like an accordion.
//
// Local frame: +X along the arrays, +Y away from the Earth once flying (the
// side the folded arrays sit on), +Z along the direction of flight.
//
// Many satellites are drawn at once (StarlinkV3Fleet), a few draw calls in
// all however many there are.

export const BUS = { x: 6.2, y: 0.32, z: 3.0 };
export const PANEL_M = 3.0; // each panel is PANEL_M square
export const PANELS_PER_WING = 8;
const BOOM = 1.6; // how far the struts hold an array out from the bus
const STACK_STEP = 0.032; // panel thickness in the folded stack

export interface PanelPose {
  /** Centre, satellite frame. */
  x: number;
  y: number;
  /** Turn about Z; 0 = lying flat, cells facing +Y. */
  angle: number;
}

/**
 * Where the panels of the +X array are at unfolding progress `p` (0 folded,
 * 1 open); the -X array is its mirror image (x → -x, angle → -angle).
 * Also returns the hinge, where the struts meet the array.
 */
export function wingPose(p: number, out: PanelPose[] = []): { hinge: THREE.Vector2; panels: PanelPose[] } {
  const swing = THREE.MathUtils.smoothstep(p, 0, 0.25); // stack stands up and out
  const extend = THREE.MathUtils.smoothstep(p, 0.25, 0.4); // struts push it clear
  const open = THREE.MathUtils.smoothstep(p, 0.4, 1); // accordion opens
  const hx = BUS.x / 2 + BOOM * extend;
  const hy = BUS.y / 2;
  const turn = (Math.PI / 2) * (1 - swing); // about Z: folded, the stack lies back over the bus
  const gamma = (Math.PI / 2) * open; // 0: panels upright and stacked; 90°: flat in a line
  const c = Math.cos(turn), s = Math.sin(turn);
  let px = 0, py = 0;
  for (let k = 0; k < PANELS_PER_WING; k++) {
    const dx = Math.sin(gamma);
    const dy = (k % 2 ? -1 : 1) * Math.cos(gamma);
    // Centre in the array's own frame (x out, y up), spread by the panels' thickness while folded.
    const lx = px + (dx * PANEL_M) / 2 + (k + 0.5) * STACK_STEP * Math.cos(gamma);
    const ly = py + (dy * PANEL_M) / 2;
    px += dx * PANEL_M;
    py += dy * PANEL_M;
    const pose = out[k] ?? (out[k] = { x: 0, y: 0, angle: 0 });
    // Into the satellite frame: turn by `turn`, then move to the hinge.
    pose.x = hx + lx * c - ly * s;
    pose.y = hy + lx * s + ly * c;
    pose.angle = Math.atan2(dy, dx) + turn;
  }
  out.length = PANELS_PER_WING;
  return { hinge: new THREE.Vector2(hx, hy), panels: out };
}

const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map(flat));

function busParts() {
  const trim: THREE.BufferGeometry[] = [new THREE.BoxGeometry(BUS.x, BUS.y, BUS.z)];
  const dishes: THREE.BufferGeometry[] = [];
  // Laser terminals on both long sides, three each, looking out sideways
  // (the top is where the folded arrays lie).
  for (const z of [1, -1]) for (const x of [-2.1, 0, 2.1]) {
    trim.push(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 14).rotateX(Math.PI / 2).translate(x, 0, z * (BUS.z / 2 + 0.11)));
    trim.push(new THREE.SphereGeometry(0.14, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(z * Math.PI / 2).translate(x, 0, z * (BUS.z / 2 + 0.22)));
  }
  // Backhaul dishes on curved arms at the four corners, facing the Earth.
  for (const x of [1, -1]) for (const z of [1, -1]) {
    const at = new THREE.Vector3(x * (BUS.x / 2 - 0.55), -BUS.y / 2 - 0.25, z * (BUS.z / 2 + 0.55));
    const arm = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x * (BUS.x / 2 - 0.55), 0, z * (BUS.z / 2 - 0.1)),
      new THREE.Vector3(x * (BUS.x / 2 - 0.55), -0.05, z * (BUS.z / 2 + 0.3)),
      at.clone().add(new THREE.Vector3(0, 0.2, 0))
    ]);
    trim.push(new THREE.TubeGeometry(arm, 10, 0.06, 6, false));
    const dish = new THREE.SphereGeometry(0.46, 20, 6, 0, Math.PI * 2, 0, Math.PI / 3.2).scale(1, 0.45, 1).rotateX(Math.PI).rotateX(z * 0.45);
    dishes.push(dish.translate(at.x, at.y, at.z));
    trim.push(new THREE.CylinderGeometry(0.1, 0.14, 0.25, 10).translate(at.x, at.y + 0.1, at.z));
  }
  // Thruster at the back.
  trim.push(new THREE.CylinderGeometry(0.16, 0.24, 0.35, 14).rotateX(Math.PI / 2).translate(0, 0, -BUS.z / 2 - 0.17));
  const top = new THREE.PlaneGeometry(BUS.x, BUS.z).rotateX(-Math.PI / 2).translate(0, BUS.y / 2 + 0.004, 0);
  // Three phased-array antennas on the Earth face.
  const under: THREE.BufferGeometry[] = [-2.05, 0, 2.05].map((x) => new THREE.PlaneGeometry(1.9, BUS.z - 0.3).rotateX(Math.PI / 2).translate(x, -BUS.y / 2 - 0.004, 0));
  return { trim: merge(trim), dishes: merge(dishes), top, under: merge(under) };
}

const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
const STRUTS_PER_WING = 3;

/** Any number of Starlink V3 satellites, each with its own pose and unfolding progress. */
export class StarlinkV3Fleet {
  readonly group = new THREE.Group();
  private bodies: THREE.InstancedMesh[];
  private cells: THREE.InstancedMesh;
  private backs: THREE.InstancedMesh;
  private struts: THREE.InstancedMesh;
  private poses: PanelPose[] = [];
  private m = new THREE.Matrix4();
  private local = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private mid = new THREE.Vector3();
  private stretch = new THREE.Vector3();
  private one = new THREE.Vector3(1, 1, 1);
  private Z = new THREE.Vector3(0, 0, 1);
  private Y = new THREE.Vector3(0, 1, 0);

  constructor(readonly count: number) {
    const mat = vehicleMaterials();
    const parts = busParts();
    const instanced = (geo: THREE.BufferGeometry, material: THREE.Material, n: number) => {
      const mesh = new THREE.InstancedMesh(geo, material, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      for (let i = 0; i < n; i++) mesh.setMatrixAt(i, hidden);
      this.group.add(mesh);
      return mesh;
    };
    this.bodies = [
      instanced(parts.trim, mat.v3Trim, count),
      instanced(parts.dishes, mat.v3Dish, count),
      instanced(parts.top, mat.v3Plate, count),
      instanced(parts.under, mat.v3Under, count)
    ];
    const panelCount = count * PANELS_PER_WING * 2;
    this.cells = instanced(new THREE.PlaneGeometry(PANEL_M, PANEL_M).rotateX(-Math.PI / 2).translate(0, 0.006, 0), mat.v3Cells, panelCount);
    this.backs = instanced(new THREE.PlaneGeometry(PANEL_M, PANEL_M).rotateX(Math.PI / 2).translate(0, -0.006, 0), mat.v3CellsBack, panelCount);
    this.struts = instanced(new THREE.CylinderGeometry(0.045, 0.045, 1, 6), mat.v3Trim, count * STRUTS_PER_WING * 2);
  }

  /** Place satellite `i` (its matrix in the fleet's parent frame, metres), or hide it with null. */
  set(i: number, matrix: THREE.Matrix4 | null, unfold: number) {
    if (!matrix) {
      for (const b of this.bodies) b.setMatrixAt(i, hidden);
      for (let k = 0; k < PANELS_PER_WING * 2; k++) {
        this.cells.setMatrixAt(i * PANELS_PER_WING * 2 + k, hidden);
        this.backs.setMatrixAt(i * PANELS_PER_WING * 2 + k, hidden);
      }
      for (let k = 0; k < STRUTS_PER_WING * 2; k++) this.struts.setMatrixAt(i * STRUTS_PER_WING * 2 + k, hidden);
      return;
    }
    for (const b of this.bodies) b.setMatrixAt(i, matrix);
    const { hinge, panels } = wingPose(unfold, this.poses);
    let n = i * PANELS_PER_WING * 2;
    for (const side of [1, -1]) {
      for (const p of panels) {
        this.q.setFromAxisAngle(this.Z, side * p.angle);
        this.local.compose(this.v.set(side * p.x, p.y, 0), this.q, this.one);
        this.m.multiplyMatrices(matrix, this.local);
        this.cells.setMatrixAt(n, this.m);
        this.backs.setMatrixAt(n, this.m);
        n++;
      }
    }
    // Struts: two from the corners of the bus to the hinge, one straight out from the middle.
    let s = i * STRUTS_PER_WING * 2;
    for (const side of [1, -1]) {
      const h = this.v.set(side * hinge.x, hinge.y - 0.05, 0);
      for (const z of [1.2, -1.2, 0]) {
        this.a.set(side * (BUS.x / 2 - (z ? 0.3 : 0)), 0, z);
        this.b.set(h.x, h.y, z * 0.18);
        const length = Math.max(0.01, this.a.distanceTo(this.b));
        this.q.setFromUnitVectors(this.Y, this.dir.subVectors(this.b, this.a).normalize());
        this.local.compose(this.mid.addVectors(this.a, this.b).multiplyScalar(0.5), this.q, this.stretch.set(1, length, 1));
        this.m.multiplyMatrices(matrix, this.local);
        this.struts.setMatrixAt(s++, this.m);
      }
    }
  }

  /** Call once a frame after the satellites are set. */
  commit() {
    for (const mesh of [...this.bodies, this.cells, this.backs, this.struts]) mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    for (const mesh of [...this.bodies, this.cells, this.backs, this.struts]) mesh.geometry.dispose();
  }
}
