// City lights from a list of real cities (public/data/cities.bin, built by
// scripts/build-cities.mjs from GeoNames). Where each city is and how many
// people live there are real; the individual lights are generated: more of
// them, spread over a wider patch, the bigger the city.

export interface Cities {
  n: number;
  /** Degrees. */
  lat: Float32Array;
  lon: Float32Array;
  /** People. */
  pop: Float32Array;
  /** Ground height, metres. */
  height: Float32Array;
}

export function decodeCities(buffer: ArrayBuffer): Cities {
  const view = new DataView(buffer);
  const n = Math.floor(buffer.byteLength / 8);
  const out: Cities = { n, lat: new Float32Array(n), lon: new Float32Array(n), pop: new Float32Array(n), height: new Float32Array(n) };
  for (let i = 0; i < n; i++) {
    out.lat[i] = (view.getInt16(i * 8, true) / 32767) * 90;
    out.lon[i] = (view.getInt16(i * 8 + 2, true) / 32767) * 180;
    out.pop[i] = view.getUint16(i * 8 + 4, true) * 1000;
    out.height[i] = view.getInt16(i * 8 + 6, true);
  }
  return out;
}

/** Lights drawn for a city: 2 for a town of 15,000, 16 for a million, 80 for 25 million. */
export const lightsFor = (pop: number) => Math.max(2, Math.min(120, Math.round(2 * Math.sqrt(pop / 15_000))));

/** Radius of the built-up patch, km, at a typical 3,500 people per km². */
export const urbanRadiusKm = (pop: number) => Math.sqrt(pop / (3500 * Math.PI));

// WGS84
const A = 6_378_137;
const E2 = 6.69437999014e-3;
const UNIT_M = 6_371_000;
const D2R = Math.PI / 180;

/** A small repeatable random source, so the same lights appear on every visit. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CityLights {
  count: number;
  /** Where each light is on the real Earth (WGS84 with ground height), scene units, packed xyz. */
  position: Float32Array;
  /** rgb + brightness per light. */
  look: Float32Array;
}

/** Scatters each city's lights over its built-up patch. */
export function buildCityLights(c: Cities): CityLights {
  let count = 0;
  for (let i = 0; i < c.n; i++) count += lightsFor(c.pop[i]);
  const position = new Float32Array(count * 3), look = new Float32Array(count * 4);
  const rand = mulberry32(20261120);
  let k = 0;
  for (let i = 0; i < c.n; i++) {
    const n = lightsFor(c.pop[i]);
    const sigma = urbanRadiusKm(c.pop[i]) * 0.75;
    // Small towns are dimmer, not just fewer.
    const town = Math.max(0.55, Math.min(1, 0.55 + 0.3 * Math.log10(c.pop[i] / 15_000)));
    const cosLat = Math.max(0.05, Math.cos(c.lat[i] * D2R));
    for (let j = 0; j < n; j++, k++) {
      // Gaussian scatter (Box-Muller), kept within 2.2 sigma.
      const r = Math.min(2.2, Math.sqrt(-2 * Math.log(1 - rand()))) * sigma;
      const a = rand() * 2 * Math.PI;
      const lat = (c.lat[i] + (r * Math.sin(a)) / 111.2) * D2R;
      const lon = (c.lon[i] + (r * Math.cos(a)) / (111.2 * cosLat)) * D2R;
      const cl = Math.cos(lat), sl = Math.sin(lat), co = Math.cos(lon), so = Math.sin(lon);
      // Scene axes: X to lat 0 lon 0, Y north, Z to lon -90 (see lib/geo).
      const N = A / Math.sqrt(1 - E2 * sl * sl);
      const h = Math.max(0, c.height[i]);
      position[k * 3] = ((N + h) * cl * co) / UNIT_M;
      position[k * 3 + 1] = ((N * (1 - E2) + h) * sl) / UNIT_M;
      position[k * 3 + 2] = (-(N + h) * cl * so) / UNIT_M;
      // Mostly warm sodium light, some cooler white.
      const warm = rand();
      look[k * 4] = 1;
      look[k * 4 + 1] = 0.72 + 0.2 * warm;
      look[k * 4 + 2] = 0.42 + 0.45 * warm * warm;
      look[k * 4 + 3] = town * (0.55 + 0.45 * rand());
    }
  }
  return { count, position, look };
}
