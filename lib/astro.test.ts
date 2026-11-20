import { describe, expect, it } from 'vitest';
import { moonFix, sunFix } from './astro';
import { latLonToUnit, unitToLatLon } from './geo';

// These pin the frame: the old globe had a hand-tuned 12 h offset and a tilt
// hack, so the lit side could be wrong without anyone noticing.

describe('sunFix', () => {
  it('is over the Tropic of Capricorn at the December solstice', () => {
    const s = sunFix(new Date('2026-12-21T20:50:00Z'));
    expect(s.lat).toBeCloseTo(-23.44, 1);
  });

  it('is near the Greenwich meridian at noon UTC on the March equinox', () => {
    const s = sunFix(new Date('2026-03-20T12:00:00Z'));
    expect(Math.abs(s.lat)).toBeLessThan(0.5);
    expect(Math.abs(s.lon)).toBeLessThan(3); // equation of time is ~-7 min ≈ 1.8°
  });

  it('moves west 15° an hour', () => {
    const a = sunFix(new Date('2026-06-01T00:00:00Z')).lon;
    const b = sunFix(new Date('2026-06-01T01:00:00Z')).lon;
    expect(((a - b + 540) % 360) - 180).toBeCloseTo(15, 0);
  });

  it('is at perihelion distance (0.983 AU) in early January', () => {
    expect(sunFix(new Date('2026-01-03T00:00:00Z')).distance).toBeCloseTo(23_089, -2);
  });
});

describe('moonFix', () => {
  it('is 56–64 Earth radii away and within ~29° of the equator', () => {
    for (const d of ['2026-01-10', '2026-04-22', '2026-09-03', '2026-11-19']) {
      const m = moonFix(new Date(`${d}T00:00:00Z`));
      expect(m.distance).toBeGreaterThan(55);
      expect(m.distance).toBeLessThan(64.5);
      expect(Math.abs(m.lat)).toBeLessThan(29);
    }
  });
});

describe('latLonToUnit', () => {
  it('round-trips and puts (0,0) on +X, the north pole on +Y', () => {
    const origin = latLonToUnit(0, 0);
    expect(origin.x).toBeCloseTo(1);
    expect(origin.z).toBeCloseTo(0);
    expect(latLonToUnit(90, 0).y).toBeCloseTo(1);
    const back = unitToLatLon(latLonToUnit(25.997, -97.158));
    expect(back.lat).toBeCloseTo(25.997, 6);
    expect(back.lon).toBeCloseTo(-97.158, 6);
  });
});

describe('parseDeepLink', () => {
  it('reads a fly pose and a time, and rejects nonsense', async () => {
    const { parseDeepLink } = await import('./world');
    expect(parseDeepLink('?fly=45.98,7.66,8,200,-15&time=2026-11-20T12:00Z')).toEqual({
      fly: { lat: 45.98, lon: 7.66, altKm: 8, heading: 200, pitch: -15 },
      timeMs: Date.parse('2026-11-20T12:00Z')
    });
    expect(parseDeepLink('?fly=95,0,8').fly).toBeUndefined();
    expect(parseDeepLink('?fly=1,2&time=soon')).toEqual({});
  });
});
