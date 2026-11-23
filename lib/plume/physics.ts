// What shapes a rocket's exhaust as it climbs: the air's pressure round it.
//
// Raptor's exhaust leaves the nozzle at about 0.75 bar. At sea level the air
// (1 bar) squeezes it into a long, narrow column with a few bright shock
// "diamonds" in it; as the air thins the exhaust spreads wider and wider, the
// diamonds stretch apart and fade, and in near-vacuum it balloons out into a
// faint bell hundreds of metres across. Everything here is worked out from
// published engine numbers and the 1976 US Standard Atmosphere; the look it
// drives is matched to launch photos (lib/plume/look).

/** Air pressure (Pa) at `hKm` above sea level: the 1976 US Standard Atmosphere's layers. */
export function airPressure(hKm: number) {
  // Its layers are set in geopotential height, a little lower than true height.
  const h = (EARTH_R * Math.max(0, hKm)) / (EARTH_R + Math.max(0, hKm)) * 1000;
  let i = LAYERS.length - 1;
  while (i > 0 && h < LAYERS[i][0]) i--;
  const [hb, tb, lapse, pb] = LAYERS[i];
  return lapse === 0 ? pb * Math.exp((-G0M_R * (h - hb)) / tb) : pb * Math.pow(tb / (tb + lapse * (h - hb)), G0M_R / lapse);
}

// Base height (m), temperature (K), lapse rate (K/m), pressure (Pa).
const LAYERS: [number, number, number, number][] = [
  [0, 288.15, -0.0065, 101325],
  [11000, 216.65, 0, 22632.06],
  [20000, 216.65, 0.001, 5474.889],
  [32000, 228.65, 0.0028, 868.0187],
  [47000, 270.65, 0, 110.9063],
  [51000, 270.65, -0.0028, 66.93887],
  [71000, 214.65, -0.002, 3.95642],
  [84852, 186.87, 0, 0.3734]
];
const G0M_R = (9.80665 * 0.0289644) / 8.31446;
const EARTH_R = 6356.766; // km, the standard's

// Raptor, mid case: 325 bar in the chamber, exhaust gas γ 1.22, nozzle area
// ratio 34.3 and a 1.30 m exit (the FAA's plume study), so 0.76 bar at the exit.
const GAMMA = 1.22;
const CHAMBER_PA = 325e5;
const AREA_RATIO = 34.34;
const EXIT_D = 1.3;
export const EXIT_PA = 0.75e5;

/**
 * How far the exhaust has expanded, 0 at sea level to 1 in near-vacuum (about
 * 60 km up): from how much higher the exhaust's pressure is than the air's, on
 * a log scale, saturating at 3,000 times.
 */
export function expansion(hKm: number) {
  const r = EXIT_PA / airPressure(hKm);
  return r <= 1 ? 0 : Math.min(1, Math.log10(r) / Math.log10(3000));
}

const areaRatio = (m: number) => (1 / m) * Math.pow((2 / (GAMMA + 1)) * (1 + ((GAMMA - 1) / 2) * m * m), (GAMMA + 1) / (2 * (GAMMA - 1)));
/** The Mach number the exhaust reaches once it has expanded to the air's pressure. */
const machAt = (pa: number) => Math.sqrt((Math.pow(pa / CHAMBER_PA, -(GAMMA - 1) / GAMMA) - 1) * (2 / (GAMMA - 1)));
/** One engine's shock-cell length (m): Prandtl's formula on the jet once it matches the air's pressure. */
function engineCell(hKm: number) {
  const m = machAt(airPressure(hKm));
  const d = EXIT_D * Math.sqrt(areaRatio(m) / AREA_RATIO);
  return 1.306 * d * Math.sqrt(m * m - 1);
}
const SEA_CELL = engineCell(0);

/**
 * Spacing of the shock diamonds in the merged plume of `engines` lit engines
 * (m): 27 m for all 33 at sea level (measured on launch photos, about three
 * booster widths), longer as the air thins, as one engine's cells grow; a
 * smaller cluster is a narrower jet, with closer cells.
 */
export function cellLength(hKm: number, engines = 33) {
  return 27 * Math.sqrt(engines / 33) * (engineCell(hKm) / SEA_CELL);
}

/**
 * How many diamonds show in Super Heavy's plume: three at liftoff, two by
 * about 4 km, none above about 9 km (no photo shows any higher up).
 */
export function diamondCount(hKm: number) {
  const s = (a: number, b: number) => Math.min(1, Math.max(0, (hKm - a) / (b - a)));
  const smooth = (x: number) => x * x * (3 - 2 * x);
  return (3 - smooth(s(0.5, 4.5))) * (1 - smooth(s(4.5, 9)));
}
