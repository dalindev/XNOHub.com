import { describe, expect, it } from 'vitest';
import { EARTH_RADIUS_KM } from '@/lib/geo';
import {
  DAY_SAT,
  SCALE_HEIGHT_KM,
  SKY_GLSL,
  SKY_K,
  X_HORIZON,
  airmass,
  transmittance,
  column,
  domeWeight,
  newSkyState,
  radiance,
  skyAt,
  skyLight
} from '@/lib/sky-model';

const luminance = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const day = (mu: number, h: number) => radiance(DAY_SAT, column(mu, h));
const srgb = (x: number) => Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055));

describe('sky by altitude', () => {
  it('uses the Kasten–Young air mass', () => {
    expect(airmass(1)).toBeCloseTo(1, 3);
    expect(X_HORIZON).toBeGreaterThan(37.5);
    expect(X_HORIZON).toBeLessThan(38.5);
  });

  it('is continuous across the horizon', () => {
    for (const h of [0, 10, 27, 40, 72]) {
      const above = column(1e-7, h);
      const below = column(-1e-7, h);
      expect(Math.abs(above - below) / above).toBeLessThan(1e-3);
    }
  });

  it('is sky-blue from the ground', () => {
    expect(day(1, 0).map(srgb)).toEqual([69, 121, 209]);
    const horizon = day(0, 0).map(srgb);
    expect(horizon[2]).toBeGreaterThan(225);
    expect(horizon[0]).toBeGreaterThan(160);
  });

  it('goes navy overhead by 27 km and near-black by 40 km, over a bright band', () => {
    const sea = luminance(day(1, 0));
    expect(luminance(day(1, 27)) / sea).toBeLessThan(0.06);
    expect(luminance(day(1, 40)) / sea).toBeLessThan(0.015);
    expect(luminance(day(0, 27))).toBeGreaterThan(10 * luminance(day(1, 27)));
    // The band just above the limb still crosses a full horizon of air.
    for (let h = 0; h <= 80; h += 5) {
      const dip = -Math.sqrt(1 - (EARTH_RADIUS_KM / (EARTH_RADIUS_KM + h)) ** 2);
      expect(column(dip, h)).toBeGreaterThanOrEqual(X_HORIZON - 1e-9);
    }
  });

  it('dims the light round the camera with height, and fades the dome out by 90 km', () => {
    expect(skyLight(0, 1)).toBeCloseTo(1, 6);
    expect(skyLight(27, 1)).toBeLessThan(0.5);
    expect(skyLight(27, 1)).toBeGreaterThan(0.4);
    expect(skyLight(40, 1)).toBeCloseTo(0.1, 1);
    for (let h = 0; h < 100; h += 0.5) expect(skyLight(h + 0.5, 1)).toBeLessThanOrEqual(skyLight(h, 1) + 1e-12);
    for (const h of [90, 120, 550]) expect(skyLight(h, 1)).toBe(0);
    expect(domeWeight(0)).toBe(1);
    expect(domeWeight(59.9)).toBe(1);
    expect(domeWeight(90)).toBe(0);
    expect(domeWeight(400)).toBe(0);
    expect(skyLight(0, 0)).toBe(0);
  });

  it('keeps today’s sunrise and sunset timing', () => {
    const s = skyAt(0, 0.5, newSkyState());
    expect(s.day).toBe(1);
    expect(s.dusk).toBe(0);
    expect(s.sat).toEqual([...DAY_SAT]);
    const dusk = skyAt(0, 0, newSkyState());
    expect(dusk.dusk).toBeCloseTo(0.6, 6);
    expect(dusk.day).toBeGreaterThan(0);
    expect(dusk.day).toBeLessThan(0.5);
    const night = skyAt(0, -0.3, newSkyState());
    expect(night.day + night.dusk + night.light).toBe(0);
    expect(night.horizon).toEqual([0, 0, 0]);
  });

  it('dims and reddens the Sun low down, and hides it behind the Earth', () => {
    const noon = transmittance(1, 0);
    expect(noon[0]).toBeGreaterThan(0.8);
    expect(noon[2]).toBeGreaterThan(0.65);
    const low = transmittance(Math.sin((10 * Math.PI) / 180), 0);
    expect(low[0]).toBeGreaterThan(low[1]);
    expect(low[1]).toBeGreaterThan(low[2]);
    expect(low[2]).toBeLessThan(0.3);
    expect(transmittance(0, 0)[0]).toBeLessThan(0.01);
    expect(transmittance(-0.01, 0)).toEqual([0, 0, 0]);
    // From 30 km the Sun just below the astronomical horizon still shows, red.
    const dip = transmittance(-0.05, 30);
    expect(dip[0]).toBeGreaterThan(0);
    expect(dip[0]).toBeGreaterThan(dip[2]);
    for (const c of transmittance(0.2, 120)) expect(c).toBeGreaterThan(0.999);
  });

  it('gives the shader the same numbers', () => {
    expect(SKY_GLSL).toContain(`SKY_H = ${SCALE_HEIGHT_KM.toFixed(6)}`);
    expect(SKY_GLSL).toContain(`SKY_R = ${EARTH_RADIUS_KM.toFixed(6)}`);
    expect(SKY_GLSL).toContain(`SKY_XH = ${X_HORIZON.toFixed(6)}`);
    expect(SKY_GLSL).toContain(`vec3(${SKY_K.map((k) => k.toFixed(6)).join(', ')})`);
  });
});
