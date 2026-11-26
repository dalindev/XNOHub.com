/**
 * Starbase, Texas, as of November 2026: what stands where, in metres east (E)
 * and north (N) of the Pad 2 launch mount's centre (docs/starbase-plan.md §A4).
 *
 * Positions and footprints: OpenStreetMap (ODbL) as mapped in November 2026,
 * 1–3 m. Tower heights: FAA obstruction filings. Everything marked `L` (or
 * with `estimate`) is not published and is our guess; components/data-sources
 * lists them. Bearings are degrees clockwise from true north.
 */

export type Confidence = 'H' | 'M' | 'L';
export interface Sourced {
  source: string;
  confidence: Confidence;
}

/** The Pad 2 launch mount's centre (OSM way 1304017041). */
export const ORIGIN = { lat: 25.9967665, lon: -97.1580415 };
/** The ground as the app draws it here, above the ellipsoid (m): the median of the map's relief over the site. */
export const GROUND_M = 1.0;
/** The launch deck's height above the ground (m): not published, a placeholder (L). */
export const DECK_M = 18;
/** As of when (shown on the page). */
export const SITE_DATE = 'November 2026';

/** [E, N] metres. */
export type EN = [number, number];

export interface Box extends Sourced {
  id: string;
  name: string;
  /** Centre. */
  at: EN;
  /** Length along `bearing`, width across it (m). */
  length: number;
  width: number;
  /** Direction of the long side (degrees from north). */
  bearing: number;
  height: number;
  heightEstimated?: boolean;
}

export interface Tower extends Sourced {
  id: string;
  name: string;
  /** Centre of the lattice. */
  at: EN;
  /** Side lengths (m) and the bearing of the first side. */
  sides: [number, number];
  bearing: number;
  /** Total height above the ground (m), FAA. */
  height: number;
  /** The corner that faces the mount. */
  mountCorner: EN;
}

// ── Pad 2 ────────────────────────────────────────────────────────────────

/** The mount's outline: six sides, a 23.6 m side along 123°, a 10.7 m opening in the middle (OSM, M). */
export const MOUNT2 = {
  corners: [
    [-14.2, -1.7],
    [5.5, -14.7],
    [9.7, -11.5],
    [7.7, -8.6],
    [14.7, 1.9],
    [-3.6, 14.1]
  ] as EN[],
  opening: 10.7,
  source: 'OSM way 1304017041; deck height a placeholder',
  confidence: 'M' as Confidence
};

/** The service structure SW of the mount, holding the booster's quick disconnects (identification inferred, M; height estimated). */
export const SERVICE2 = {
  corners: [
    [-14.2, -1.7],
    [-24.6, 5.0],
    [-20.3, -9.8],
    [-2.6, -21.3],
    [15.7, -21.4],
    [5.5, -14.7]
  ] as EN[],
  height: 12,
  source: 'OSM; height estimated',
  confidence: 'L' as Confidence
};

/** The Pad 2 flame trench: 84.2 × 18.3 m along 123.2°/303.2° (OSM way 1352374225; Sentinel-2 change image within 1 m). Depth unknown. */
export const TRENCH2: Box = {
  id: 'trench2', name: 'Pad 2 flame trench', at: [-0.3, 0.0], length: 84.2, width: 18.3, bearing: 123.2, height: 0,
  source: 'OSM way 1352374225', confidence: 'M'
};

export const TOWER2: Tower = {
  id: 'tower2', name: 'Tower 2', at: [-2.6, 31.0], sides: [11.7, 11.6], bearing: 33, height: 145.1,
  mountCorner: [-0.8, 23.0],
  source: 'OSM; height FAA 2025-ASW-13942-OE (476 ft)', confidence: 'H'
};

/** Tower 2's base on its north (back) side: steel-skinned, 10.5 m. */
export const TOWER2_BASE: Box = {
  id: 'tower2base', name: 'Tower 2 base', at: [-3.4, 34.9], length: 17.4, width: 17.2, bearing: 32, height: 10.5,
  source: 'OSM way 1304017043', confidence: 'M'
};

/**
 * Tower 2's chopsticks: two trusses about 3.9 m wide and 25.9 m from hinge to
 * tip, inner faces 11.9 m apart, reaching south over the mount. Their height
 * and angle during a launch are not published (L): parked open at 60 m.
 */
export const CHOPSTICKS2 = {
  hinge: [-0.3, 21.7] as EN,
  armLength: 25.9,
  armWidth: 3.9,
  armDepth: 3,
  innerGap: 11.9,
  parkedHeight: 60,
  /** Opened outward from parallel (degrees each). */
  parkedOpen: 20,
  source: 'OSM (as drawn); height and angle at launch estimated',
  confidence: 'L' as Confidence
};

/** The ship quick-disconnect arm: on the tower's SE face, about 20 m long (L). Its height: deck + booster + 2 m. */
export const SQD_ARM2 = { length: 20, face: 'SE' as const, source: 'estimate', confidence: 'L' as Confidence };

// ── Pad 1 (rebuild) ──────────────────────────────────────────────────────

export const TOWER1: Tower = {
  id: 'tower1', name: 'Tower 1', at: [330.9, -70.8], sides: [12.3, 12.9], bearing: 36, height: 140.2,
  mountCorner: [339.6, -69.1],
  source: 'OSM; height FAA 2024-ASW-5880-OE (460 ft); its mast reportedly removed 2026-09-01', confidence: 'H'
};
/** Tower 1's chopsticks were cut in half: stubs about 18 m long (L). */
export const TOWER1_STUBS = { length: 18, height: 70, source: 'NSF; stub length and height estimated', confidence: 'L' as Confidence };

/** Pad 1, rebuilt for V3: four mount legs, no deck yet (as of 2026-10-23). */
export const PAD1 = { mount: [361.0, -68.8] as EN, legHeight: 14, source: 'NSF 2026-10-23; leg height estimated', confidence: 'L' as Confidence };
export const TRENCH1: Box = {
  id: 'trench1', name: 'Pad 1 flame trench', at: [362.9, -70.8], length: 84.0, width: 18.3, bearing: 39, height: 0,
  source: 'OSM', confidence: 'M'
};
export const APRON1 = { corners: [[288, -90], [408, -90], [408, -14], [288, -14]] as EN[], source: 'OSM way 759249805', confidence: 'M' as Confidence };

// ── Tank farm and the rest ───────────────────────────────────────────────

export type TankKind = 'LOX' | 'LN2' | 'LCH4' | 'LCH4big' | 'LCH4old';
export interface HTank {
  at: EN;
  kind: TankKind;
}
/** Long axes of the horizontal tanks (degrees). */
export const TANK_BEARING = 13;
export const TANK_SIZE: Record<TankKind, { length: number; diameter: number }> = {
  LOX: { length: 48.4, diameter: 5.9 },
  LN2: { length: 48.4, diameter: 5.9 },
  LCH4: { length: 48.4, diameter: 5.9 },
  LCH4big: { length: 50.1, diameter: 6.5 },
  LCH4old: { length: 31.4, diameter: 8.1 }
};
/** The 26 horizontal tanks (OSM, positions H). The two unlabelled ones are likely LN2 (M). */
export const H_TANKS: HTank[] = [
  ...([[219.3, 55.2], [226.0, 53.7], [232.8, 52.2], [241.3, 50.3], [248.0, 48.7], [254.7, 47.0], [261.5, 45.3], [268.3, 43.6], [301.6, 36.0], [307.8, 34.5]] as EN[]).map((at) => ({ at, kind: 'LOX' as const })),
  ...([[276.0, 41.6], [282.5, 40.5], [288.9, 39.0], [295.5, 37.5], [345.0, 31.6], [351.4, 29.9], [331.9, 34.4], [338.2, 33.0]] as EN[]).map((at) => ({ at, kind: 'LN2' as const })),
  ...([[358.3, 27.4], [366.1, 25.7]] as EN[]).map((at) => ({ at, kind: 'LCH4big' as const })),
  ...([[373.3, 24.6], [379.8, 23.1], [386.3, 21.5], [392.7, 19.8]] as EN[]).map((at) => ({ at, kind: 'LCH4' as const })),
  ...([[415.2, 26.8], [424.0, 24.8]] as EN[]).map((at) => ({ at, kind: 'LCH4old' as const }))
];

/** Pad 2's deluge water tanks: 5 of 39.2 m and 6 of about 26 m, 3.4–3.5 m across, axes 14.5° (OSM, H). */
export const DELUGE_TANKS = {
  bearing: 14.5,
  long: { length: 39.2, diameter: 3.4, at: [[52.3, 75.8], [56.0, 74.8], [59.7, 73.8], [63.5, 72.8], [67.1, 71.9]] as EN[] },
  short: { length: 26, diameter: 3.5, at: [[79.4, 68.0], [83.2, 67.0], [86.9, 66.0], [90.5, 65.1], [94.4, 64.2], [98.4, 63.2]] as EN[] }
};

/** Vertical tanks Ø2.8 m, 6 m tall (OSM). */
export const V_TANKS: EN[] = [[235.4, 88.8], [250.0, 85.1], [267.0, 81.6], [270.6, 80.7], [333.5, 60.6], [80.9, 97.7], [85.3, 96.6], [99.0, 93.4], [103.7, 92.2]];
/** 25 vaporizers, 2.4 × 2.2 m, in rows at E 218–330, N 59–98; height about 8 m (estimate). Laid out in 5 rows of 5 along the tank bearing. */
export const VAPORIZERS = { count: 25, from: [218, 59] as EN, to: [330, 98] as EN, size: [2.4, 2.2] as [number, number], height: 8 };

const b = (id: string, name: string, at: EN, length: number, width: number, bearing: number, height: number, heightEstimated: boolean, source: string, confidence: Confidence): Box => ({ id, name, at, length, width, bearing, height, heightEstimated, source, confidence });

/** Buildings, bunkers and walls (OSM footprints; heights from OSM where tagged, else 6 m estimated). */
export const BUILDINGS: Box[] = [
  b('blastwall', 'Blast wall', [218.5, 26.6], 150, 0.6, 103.1, 5.5, false, 'OSM way 1240890715', 'M'),
  b('gasgen', 'Gas generator building', [91.2, 90.1], 31.6, 15.8, 104, 6, true, 'OSM', 'M'),
  b('loxgse', 'LOX GSE', [189.6, 89.7], 56.9, 29.5, 103, 6, true, 'OSM', 'M'),
  b('ch4gse', 'CH4 GSE', [181.8, 63.1], 60.5, 21.8, 103, 6, true, 'OSM', 'M'),
  b('ch4reclaim', 'CH4 reclaim', [177.7, 42.9], 59.4, 12.3, 103, 6, true, 'OSM', 'M'),
  b('powercomms', 'Power & Comms', [81.4, 137.4], 33.9, 9.1, 103, 6, true, 'OSM', 'M'),
  b('unnamed', 'Building', [25.3, 93.9], 34.3, 25.4, 14, 6, true, 'OSM', 'M'),
  b('megabunker', 'Megabunker', [133.3, 124.5], 50.8, 19.5, 103, 4.1, false, 'OSM', 'M'),
  b('subbunker', 'Suborbital GSE bunker', [81.7, 117.5], 37.1, 9.3, 103, 4.3, false, 'OSM', 'M'),
  b('control', 'Control Center', [57.8, 128.0], 12.6, 8.7, 103, 4.1, false, 'OSM', 'M'),
  b('powerbunker', 'Power bunker', [233.3, 105.8], 30.7, 5.9, 103, 4, true, 'OSM', 'M'),
  b('security', 'Security', [41.1, 150.4], 9.4, 5.4, 103, 3, false, 'OSM', 'M')
];

/** Starhopper, kept as a monument: 9 m across on legs, 17.9 m tall (OSM way 732730820). */
export const STARHOPPER = { at: [68.4, 197.9] as EN, diameter: 9, height: 17.9, source: 'OSM way 732730820', confidence: 'M' as Confidence };

/** The pond SW of Pad 2 (OSM, H). */
export const POND: EN[] = [[-40.3, -42.4], [-28.1, -37.3], [-10.8, -45.3], [-5.6, -57.8], [-29.5, -70.8], [-34.6, -69.2]];
