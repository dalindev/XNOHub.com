import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { siteMaterials, type SiteMaterialName } from '@/lib/models/site-materials';
import { local, yawFor } from '@/lib/sites/frame';
import {
  BUILDINGS,
  DELUGE_TANKS,
  H_TANKS,
  STARHOPPER,
  TANK_BEARING,
  TANK_SIZE,
  V_TANKS,
  VAPORIZERS,
  type Box,
  type EN
} from '@/lib/sites/starbase';

/**
 * Starbase's tank farm and the rest of the support site (tier B in
 * docs/starbase-plan.md §A4): the 26 horizontal tanks, Pad 2's 11 deluge
 * tanks, the vertical tanks, the 25 vaporizers, the buildings, bunkers and
 * blast wall, and Starhopper.
 *
 * Local site frame, metres: X east, Y up, Z south; origin the Pad 2 mount
 * centre on the drawn ground. One merged mesh per material (4 draw calls).
 *
 * Published (lib/sites/starbase.ts, OSM unless noted): every position, every
 * footprint (tank lengths and diameters, building lengths and widths), the
 * bearings (tanks 13°, deluge tanks 14.5°, buildings), building heights where
 * not flagged `heightEstimated`, the blast wall's 5.5 m, the vertical tanks'
 * Ø2.8 × 6 m, the methane pair's 7.1 m (OSM tag, plan §A4), the vaporizers'
 * 2.4 × 2.2 m, Starhopper's 9 m and 17.9 m.
 * Estimated (named here as constants): end-cap depth, saddles, rib spacing,
 * the vertical tanks' dome, the vaporizers' height, layout and fins, and
 * Starhopper's legs and cone.
 */

// ── Estimates (none of these is published) ──────────────────────────────

/** Horizontal tanks: end caps are half-ellipsoids this fraction of the diameter deep (estimate). */
const CAP_DEPTH = 0.25;
/** Saddles: the tank's underside sits this high above the ground (estimate, plan §A4 "about 1 m"). */
export const SADDLE_M = 1;
/**
 * The methane pair (LCH4big) is tagged 7.1 m tall in OSM (plan §A4: "2 of 50.1 × 6.5 m, 7.1 m tall";
 * not in lib/sites/starbase.ts, so defined here). That published top wins over the estimated saddle:
 * those two stand on 7.1 − 6.5 = 0.6 m saddles.
 */
export const LCH4BIG_TOP_M = 7.1;
/** Saddles per tank and their spacing as a fraction of the length from the centre (estimate). */
const SADDLE_AT = [-0.35, 0, 0.35];
/** Saddle size along the tank axis (m) and across it as a fraction of the diameter (estimate). */
const SADDLE_THICK = 0.8;
const SADDLE_ACROSS = 0.8;
/** The older ribbed methane tanks: a stiffening ring every 2 m, 0.3 m wide, 0.15 m proud (estimate). */
const RIB_PITCH = 2;
const RIB_WIDTH = 0.3;
const RIB_DEPTH = 0.15;
/** Vertical tanks: the dome's rise (m), inside the published 6 m total (estimate). */
const V_DOME = 0.7;
const V_RADIUS = 1.4; // Ø2.8 m (OSM)
const V_HEIGHT = 6; // 6 m (OSM)
/** Vaporizers: rows run along 103°, the units laid out in a 5 × 5 grid inside VAPORIZERS.from–.to (estimate). */
const VAP_ROW_BEARING = 103;
const VAP_ROWS = 5;
const VAP_PER_ROW = 5;
/** Half-spans of the grid along and across the rows (m), chosen so every unit stays inside the mapped box (estimate). */
const VAP_HALF_ALONG = 44;
const VAP_HALF_ACROSS = 8;
/** Starhopper: body bottom, top of the cylinder, top cap radius (m); legs' feet radius (estimate, matches OSM's 20 × 17 m footprint for a three-legged stance). */
const HOP_BODY_BOTTOM = 3;
const HOP_CYL_TOP = 12.5;
const HOP_TOP_RADIUS = 0.8;
const HOP_FOOT_RADIUS = 11.5;
const HOP_LEG_SIZE = 0.6;
/** Leg bearings (estimate). */
const HOP_LEG_BEARINGS = [0, 120, 240];

const RADIAL = 20; // horizontal tank segments (even, so each tank is symmetric about its axis)

// ── Helpers ──────────────────────────────────────────────────────────────

/** Non-indexed, position + normal only, so everything merges. */
function prep(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) if (name !== 'position' && name !== 'normal') out.deleteAttribute(name);
  return out;
}

/** Turn a part built along local +X to `bearing` and move it to (E, N), `y` up. */
function place(g: THREE.BufferGeometry, at: EN, bearing: number, y = 0) {
  const [x, z] = local(at[0], at[1]);
  return g.rotateY(yawFor(bearing)).translate(x, y, z);
}

/** A box `length` along `bearing`, `width` across, from y0 up `height`. */
function box(at: EN, length: number, width: number, height: number, bearing: number, y0 = 0) {
  return place(new THREE.BoxGeometry(length, height, width).translate(0, height / 2, 0), at, bearing, y0);
}

/**
 * A horizontal tank's skin, `length` overall, round its own axis along local
 * +X, centred on the origin: a cylinder closed by half-ellipsoid ends. `ribs`
 * adds stiffening rings along the cylinder.
 */
function tankSkin(length: number, diameter: number, ribs = false) {
  const r = diameter / 2;
  const cap = CAP_DEPTH * diameter;
  const half = length / 2;
  const body = half - cap;
  const pts: THREE.Vector2[] = [];
  const CAP_STEPS = 6;
  // Lathe profile (radius, position along the axis), from the −X end to the +X end.
  for (let i = 0; i <= CAP_STEPS; i++) {
    const t = (i / CAP_STEPS) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(r * Math.sin(t), 0.001), -body - cap * Math.cos(t)));
  }
  if (ribs) {
    const n = Math.floor((body - RIB_WIDTH) / RIB_PITCH);
    for (let k = -n; k <= n; k++) {
      const c = k * RIB_PITCH;
      pts.push(new THREE.Vector2(r, c - RIB_WIDTH / 2), new THREE.Vector2(r + RIB_DEPTH, c - RIB_WIDTH / 2));
      pts.push(new THREE.Vector2(r + RIB_DEPTH, c + RIB_WIDTH / 2), new THREE.Vector2(r, c + RIB_WIDTH / 2));
    }
  }
  for (let i = CAP_STEPS; i >= 0; i--) {
    const t = (i / CAP_STEPS) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(r * Math.sin(t), 0.001), body + cap * Math.cos(t)));
  }
  // Lathe round +Y, then lay it along +X.
  return prep(new THREE.LatheGeometry(pts, RADIAL)).rotateZ(-Math.PI / 2);
}

/** Whether (E, N) falls inside a building's footprint (its length along `bearing`, width across). */
function insideBox(at: EN, b: Box) {
  const r = (b.bearing * Math.PI) / 180;
  const de = at[0] - b.at[0], dn = at[1] - b.at[1];
  const along = de * Math.sin(r) + dn * Math.cos(r);
  const across = de * Math.cos(r) - dn * Math.sin(r);
  return Math.abs(along) < b.length / 2 && Math.abs(across) < b.width / 2;
}

interface Range {
  id: string;
  start: number;
  count: number;
}

/** Collects parts for one material, remembering each named part's vertex range in the merged result. */
class Batch {
  parts: THREE.BufferGeometry[] = [];
  ranges: Range[] = [];
  private n = 0;
  add(g: THREE.BufferGeometry, id?: string) {
    const p = prep(g);
    if (id) this.ranges.push({ id, start: this.n, count: p.attributes.position.count });
    this.n += p.attributes.position.count;
    this.parts.push(p);
  }
  mesh(name: string, material: SiteMaterialName) {
    const g = mergeGeometries(this.parts);
    if (!g) throw new Error(`starbase-farm: could not merge ${name}`);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    const m = new THREE.Mesh(g, siteMaterials()[material]);
    m.name = name;
    m.userData.parts = this.ranges;
    return m;
  }
}

// ── Builder ──────────────────────────────────────────────────────────────

const CONCRETE_IDS = (b: Box) => /bunker/i.test(b.id) || /bunker/i.test(b.name) || b.id === 'blastwall' || /control/i.test(b.id);

/** Starbase's tank farm and support buildings, in the site frame (metres). */
export function buildFarm(): THREE.Group {
  const paint = new Batch();
  const concrete = new Batch();
  const building = new Batch();
  const steel = new Batch();

  // 1–2. Horizontal tanks (OSM positions and sizes) and Pad 2's deluge tanks, on saddles.
  const horizontal = (id: string, at: EN, length: number, diameter: number, bearing: number, ribs = false, saddle = SADDLE_M) => {
    const axisY = saddle + diameter / 2;
    paint.add(place(tankSkin(length, diameter, ribs), at, bearing, axisY), id);
    for (const f of SADDLE_AT) {
      const s = new THREE.BoxGeometry(SADDLE_THICK, saddle + 0.15 * diameter, SADDLE_ACROSS * diameter).translate(f * length, (saddle + 0.15 * diameter) / 2, 0);
      concrete.add(place(s, at, bearing));
    }
  };
  H_TANKS.forEach((t, i) => {
    const s = TANK_SIZE[t.kind];
    const saddle = t.kind === 'LCH4big' ? LCH4BIG_TOP_M - s.diameter : SADDLE_M;
    horizontal(`htank:${i}:${t.kind}`, t.at, s.length, s.diameter, TANK_BEARING, t.kind === 'LCH4old', saddle);
  });
  DELUGE_TANKS.long.at.forEach((at, i) => horizontal(`deluge:long:${i}`, at, DELUGE_TANKS.long.length, DELUGE_TANKS.long.diameter, DELUGE_TANKS.bearing));
  DELUGE_TANKS.short.at.forEach((at, i) => horizontal(`deluge:short:${i}`, at, DELUGE_TANKS.short.length, DELUGE_TANKS.short.diameter, DELUGE_TANKS.bearing));

  // 3. Vertical tanks: Ø2.8 m, 6 m (OSM), a dome of V_DOME inside that (estimate).
  const vProfile: THREE.Vector2[] = [new THREE.Vector2(0.001, 0), new THREE.Vector2(V_RADIUS, 0), new THREE.Vector2(V_RADIUS, V_HEIGHT - V_DOME)];
  for (let i = 1; i <= 4; i++) {
    const t = (i / 4) * (Math.PI / 2);
    vProfile.push(new THREE.Vector2(Math.max(V_RADIUS * Math.cos(t), 0.001), V_HEIGHT - V_DOME + V_DOME * Math.sin(t)));
  }
  // A tank whose centre falls inside a building at least as tall as its wall would be fully hidden
  // inside that box, so it is skipped and reported in userData.check. Today that is V_TANKS 5–8
  // (80.9,97.7)…(103.7,92.2), all inside the gas-generator building's mapped 31.6 × 15.8 m box,
  // whose 6 m height is itself an estimate. Data conflict for the data owner: either the OSM
  // outline encloses an open tank yard, or the tank positions are off.
  const skippedV: string[] = [];
  V_TANKS.forEach((at, i) => {
    if (BUILDINGS.some((b) => b.height >= V_HEIGHT - V_DOME && insideBox(at, b))) {
      skippedV.push(`vtank:${i}`);
      return;
    }
    const [x, z] = local(at[0], at[1]);
    paint.add(new THREE.LatheGeometry(vProfile, 16).translate(x, 0, z), `vtank:${i}`);
  });

  // 4. Vaporizers: 2.4 × 2.2 m (OSM), 8 m tall (estimate), a core and fins (estimate), in a 5 × 5 grid (estimate).
  const [vw, vd] = VAPORIZERS.size;
  const c: EN = [(VAPORIZERS.from[0] + VAPORIZERS.to[0]) / 2, (VAPORIZERS.from[1] + VAPORIZERS.to[1]) / 2];
  const ua = VAP_ROW_BEARING * (Math.PI / 180);
  const along: EN = [Math.sin(ua), Math.cos(ua)];
  const across: EN = [Math.sin(ua - Math.PI / 2), Math.cos(ua - Math.PI / 2)]; // 13°, along the tanks
  let v = 0;
  for (let row = 0; row < VAP_ROWS; row++) {
    for (let j = 0; j < VAP_PER_ROW; j++) {
      const a = -VAP_HALF_ALONG + (2 * VAP_HALF_ALONG * j) / (VAP_PER_ROW - 1);
      const b = -VAP_HALF_ACROSS + (2 * VAP_HALF_ACROSS * row) / (VAP_ROWS - 1);
      const at: EN = [c[0] + a * along[0] + b * across[0], c[1] + a * along[1] + b * across[1]];
      const fins = [
        new THREE.BoxGeometry(vw * 0.55, VAPORIZERS.height, vd * 0.55).translate(0, VAPORIZERS.height / 2, 0),
        ...[-0.42, 0, 0.42].map((f) => new THREE.BoxGeometry(vw, VAPORIZERS.height, 0.12).translate(0, VAPORIZERS.height / 2, f * vd)),
        new THREE.BoxGeometry(0.12, VAPORIZERS.height, vd).translate(0, VAPORIZERS.height / 2, 0)
      ].map(prep);
      building.add(place(mergeGeometries(fins), at, VAP_ROW_BEARING), `vaporizer:${v++}`);
    }
  }

  // 5. Buildings, bunkers, the blast wall: OSM footprints and bearings; heights OSM or 6 m (estimate, `heightEstimated`).
  for (const b of BUILDINGS) (CONCRETE_IDS(b) ? concrete : building).add(box(b.at, b.length, b.width, b.height, b.bearing), b.id);

  // 6. Starhopper: Ø9 m, 17.9 m overall (OSM way 732730820). Body bottom, cone and legs are estimates.
  const [hx, hz] = local(STARHOPPER.at[0], STARHOPPER.at[1]);
  const hr = STARHOPPER.diameter / 2;
  const hop = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, HOP_BODY_BOTTOM),
      new THREE.Vector2(hr, HOP_BODY_BOTTOM),
      new THREE.Vector2(hr, HOP_CYL_TOP),
      new THREE.Vector2(HOP_TOP_RADIUS, STARHOPPER.height),
      new THREE.Vector2(0.001, STARHOPPER.height)
    ],
    32
  ).translate(hx, 0, hz);
  steel.add(hop, 'starhopper:body');
  HOP_LEG_BEARINGS.forEach((bearing, i) => {
    const d = new THREE.Vector3(Math.sin((bearing * Math.PI) / 180), 0, -Math.cos((bearing * Math.PI) / 180));
    const top = d.clone().multiplyScalar(hr - 0.3).add(new THREE.Vector3(hx, HOP_BODY_BOTTOM + 1, hz));
    const foot = d.clone().multiplyScalar(HOP_FOOT_RADIUS).add(new THREE.Vector3(hx, HOP_LEG_SIZE / 2, hz));
    const len = top.distanceTo(foot);
    const leg = new THREE.BoxGeometry(HOP_LEG_SIZE, HOP_LEG_SIZE, len);
    const m = new THREE.Matrix4().lookAt(foot, top, new THREE.Vector3(0, 1, 0));
    m.setPosition(foot.clone().add(top).multiplyScalar(0.5));
    steel.add(leg.applyMatrix4(m), `starhopper:leg:${i}`);
  });

  const meshes = [
    paint.mesh('farm-tanks', 'paint'),
    concrete.mesh('farm-concrete', 'concrete'),
    building.mesh('farm-buildings', 'building'),
    steel.mesh('farm-starhopper', 'stainless')
  ];
  const group = new THREE.Group();
  group.name = 'starbase-farm';
  group.add(...meshes);

  const hopTop = meshes[3].geometry.boundingBox!.max.y;
  group.userData.check = {
    horizontalTanks: H_TANKS.length,
    delugeTanks: DELUGE_TANKS.long.at.length + DELUGE_TANKS.short.at.length,
    verticalTanks: V_TANKS.length - skippedV.length,
    verticalTanksSkippedInsideBuilding: skippedV,
    vaporizers: v,
    buildings: BUILDINGS.length,
    starhopperTopM: +hopTop.toFixed(2),
    triangles: meshes.reduce((s, m) => s + m.geometry.attributes.position.count / 3, 0),
    drawCalls: meshes.length
  };
  return group;
}
