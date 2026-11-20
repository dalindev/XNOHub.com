import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { NAMED_STARS, decodeStars, planetsAt, raDecToSky, skyOrientation, starColor, sunInSky } from './sky';
import { sunFix } from './astro';

const DEG = 180 / Math.PI;

describe('sky frame', () => {
  it('puts the Sun where the Earth-fixed ephemeris says it is', () => {
    for (const iso of ['2026-03-20T12:00:00Z', '2026-11-20T04:00:00Z', '2031-07-01T18:30:00Z']) {
      const date = new Date(iso);
      const viaSky = sunInSky(date).applyQuaternion(skyOrientation(date));
      expect(viaSky.angleTo(sunFix(date).direction) * DEG).toBeLessThan(0.02);
    }
  });

  it('keeps Polaris within a degree of the north pole', () => {
    const polaris = NAMED_STARS.find((s) => s.name === 'Polaris')!;
    const v = raDecToSky(polaris.ra, polaris.dec).applyQuaternion(skyOrientation(new Date('2026-11-20T00:00:00Z')));
    expect(v.angleTo(new THREE.Vector3(0, 1, 0)) * DEG).toBeLessThan(1);
  });

  it('turns the sky once per sidereal day', () => {
    const sirius = raDecToSky(101.2871, -16.7161);
    const t0 = Date.parse('2026-11-20T00:00:00Z');
    const a = sirius.clone().applyQuaternion(skyOrientation(new Date(t0)));
    const b = sirius.clone().applyQuaternion(skyOrientation(new Date(t0 + 86_164_091))); // one sidereal day
    const c = sirius.clone().applyQuaternion(skyOrientation(new Date(t0 + 6 * 3_600_000)));
    expect(a.angleTo(b) * DEG).toBeLessThan(0.01);
    expect(a.angleTo(c) * DEG).toBeGreaterThan(60);
  });
});

describe('stars and planets', () => {
  it('decodes the catalogue with Sirius first', () => {
    const buf = readFileSync('public/sky/stars.bin');
    const s = decodeStars(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(s.n).toBeGreaterThan(9000);
    expect(s.mag[0]).toBeCloseTo(-1.46, 2);
    expect(s.ra[0]).toBeCloseTo(101.287, 1);
    expect(s.dec[0]).toBeCloseTo(-16.716, 1);
  });

  it('colours hot stars blue-white and cool stars orange', () => {
    const hot = starColor(-0.25), sun = starColor(0.65), cool = starColor(1.7);
    expect(hot.b).toBeGreaterThan(hot.r);
    expect(cool.r).toBeGreaterThan(cool.b * 1.5);
    expect(sun.r).toBeGreaterThan(0.95);
    expect(sun.b).toBeGreaterThan(0.75);
  });

  it('finds the planets near the ecliptic with sane brightness', () => {
    const eps = 23.439 / DEG;
    const eclipticNorth = new THREE.Vector3(0, Math.cos(eps), Math.sin(eps));
    const planets = planetsAt(new Date('2026-11-20T00:00:00Z'));
    expect(planets.map((p) => p.name)).toEqual(['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);
    for (const p of planets) {
      expect(p.direction.length()).toBeCloseTo(1);
      expect(Math.abs(p.direction.dot(eclipticNorth))).toBeLessThan(0.17);
    }
    const venus = planets[1];
    expect(venus.magnitude).toBeLessThan(-3);
    expect(venus.magnitude).toBeGreaterThan(-5);
  });
});
