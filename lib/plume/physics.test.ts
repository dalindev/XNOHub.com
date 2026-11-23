import { describe, expect, it } from 'vitest';
import { airPressure, cellLength, diamondCount, expansion } from '@/lib/plume/physics';

describe('exhaust physics by altitude', () => {
  it('has the standard atmosphere’s pressure', () => {
    expect(airPressure(0)).toBeCloseTo(101325, 0);
    expect(airPressure(10) / 1000).toBeCloseTo(26.5, 1);
    expect(airPressure(20) / 1000).toBeCloseTo(5.53, 1);
    expect(airPressure(40)).toBeCloseTo(287, -1);
    expect(airPressure(60)).toBeCloseTo(21.96, 0);
    // Smooth across the layer boundaries, and always falling.
    for (const hp of [11, 20, 32, 47, 51, 71, 84.852]) {
      const h = (6356.766 * hp) / (6356.766 - hp); // the layer's true height
      expect(airPressure(h - 1e-6) / airPressure(h + 1e-6)).toBeCloseTo(1, 4);
    }
    for (let h = 0; h < 200; h += 0.5) expect(airPressure(h + 0.5)).toBeLessThan(airPressure(h));
  });

  it('spreads the exhaust as the air thins: none at sea level, all of it by 60 km', () => {
    expect(expansion(0)).toBe(0);
    expect(expansion(2)).toBe(0); // the exhaust's 0.75 bar still below the air's
    expect(expansion(10)).toBeCloseTo(0.13, 2);
    expect(expansion(30)).toBeCloseTo(0.52, 1);
    expect(expansion(60)).toBe(1);
    expect(expansion(200)).toBe(1);
  });

  it('spaces the diamonds 27 m apart at liftoff, longer as it climbs', () => {
    expect(cellLength(0)).toBeCloseTo(27, 5);
    expect(cellLength(2.5)).toBeGreaterThan(31);
    expect(cellLength(2.5)).toBeLessThan(33);
    expect(cellLength(10)).toBeGreaterThan(53);
    expect(cellLength(10)).toBeLessThan(57);
    // Fewer engines, a narrower jet with shorter cells.
    expect(cellLength(0, 13)).toBeCloseTo(27 * Math.sqrt(13 / 33), 5);
    expect(Number.isFinite(cellLength(200))).toBe(true);
  });

  it('shows three diamonds at liftoff, two by 4.5 km and none above 9 km', () => {
    expect(diamondCount(0)).toBe(3);
    expect(diamondCount(0.5)).toBe(3);
    expect(diamondCount(2.5)).toBeCloseTo(2.5, 5);
    expect(diamondCount(4.5)).toBe(2);
    expect(diamondCount(9)).toBe(0);
    expect(diamondCount(60)).toBe(0);
  });
});
