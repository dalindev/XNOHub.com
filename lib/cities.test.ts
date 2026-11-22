import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCityLights, decodeCities, lightsFor, urbanRadiusKm } from './cities';
import { latLonToUnit } from './geo';

const file = readFileSync('public/data/cities.bin');
const cities = decodeCities(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer);

describe('city list', () => {
  it('holds the big cities where they are, largest first', () => {
    expect(cities.n).toBeGreaterThan(20_000);
    expect(cities.pop[0]).toBeGreaterThan(15e6);
    expect(cities.pop[0]).toBeGreaterThanOrEqual(cities.pop[1]);
    // Tokyo is among the first few dozen, at 35.69° N 139.69° E.
    const tokyo = Array.from({ length: 60 }, (_, i) => i).find((i) => Math.abs(cities.lat[i] - 35.69) < 0.2 && Math.abs(cities.lon[i] - 139.69) < 0.2);
    expect(tokyo).toBeDefined();
  });
});

describe('city lights', () => {
  it('gives bigger cities more lights over a wider patch', () => {
    expect(lightsFor(15_000)).toBe(2);
    expect(lightsFor(1_000_000)).toBe(16);
    expect(lightsFor(25_000_000)).toBeGreaterThan(70);
    expect(urbanRadiusKm(10_000_000)).toBeCloseTo(30, 0);
  });

  it('keeps every light within its city, on the real ground', () => {
    const one = { n: 1, lat: new Float32Array([48.86]), lon: new Float32Array([2.35]), pop: new Float32Array([2_100_000]), height: new Float32Array([42]) };
    const lights = buildCityLights(one);
    expect(lights.count).toBe(lightsFor(2_100_000));
    // Paris on the slightly flattened real Earth: 6,366.1 km from the centre at this latitude, plus 42 m.
    const centre = latLonToUnit(48.86, 2.35);
    const reach = urbanRadiusKm(2_100_000) * 0.75 * 2.2 + 1;
    for (let k = 0; k < lights.count; k++) {
      const [x, y, z] = lights.position.subarray(k * 3, k * 3 + 3);
      const r = Math.hypot(x, y, z);
      expect(r * 6371).toBeCloseTo(6366.1, 0);
      // The same direction from the centre as the city's marker would be, to within the patch.
      expect(Math.hypot(x / r - centre.x, y / r - centre.y, z / r - centre.z) * 6371).toBeLessThan(reach);
    }
  });

  it('builds the same lights every time', () => {
    const a = buildCityLights(cities), b = buildCityLights(cities);
    expect(a.count).toBe(b.count);
    expect(a.position[1234]).toBe(b.position[1234]);
    expect(a.count).toBeGreaterThan(80_000);
    expect(a.count).toBeLessThan(400_000);
  });
});
