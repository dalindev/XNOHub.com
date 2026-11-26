import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EARTH_RADIUS_KM, ellipsoidRadius, latLonToUnit } from '@/lib/geo';
import { bearingDir, enuToScene, geodeticToScene, latLonToEnu, sceneToEnu, siteFrame, yawFor } from './frame';

const M = EARTH_RADIUS_KM * 1000;
const PAD2 = { lat: 25.9967665, lon: -97.1580415 };

describe('the site frame', () => {
  const f = siteFrame(PAD2.lat, PAD2.lon, 1);

  it('puts the origin where the globe draws that ground', () => {
    // geo.ts's own route to the same point: direction × ellipsoid radius, then 1 m up.
    const ground = latLonToUnit(PAD2.lat, PAD2.lon).multiplyScalar(ellipsoidRadius(PAD2.lat));
    const here = geodeticToScene(PAD2.lat, PAD2.lon, 0);
    expect(here.distanceTo(ground) * M).toBeLessThan(0.01);
    expect(f.origin.distanceTo(here) * M).toBeCloseTo(1, 3);
  });

  it('stands on the ellipsoid normal, 2.64 mrad off the line to the Earth’s centre', () => {
    const radial = geodeticToScene(PAD2.lat, PAD2.lon, 0).normalize();
    expect(f.up.angleTo(radial) * 1000).toBeCloseTo(2.641, 2);
    // ...and that normal is the way height grows.
    const high = geodeticToScene(PAD2.lat, PAD2.lon, 1000);
    expect(high.sub(geodeticToScene(PAD2.lat, PAD2.lon, 0)).normalize().angleTo(f.up)).toBeLessThan(1e-9);
  });

  it('has north toward higher latitude and east toward higher longitude, square to each other', () => {
    const n = latLonToEnu(f, PAD2.lat + 0.001, PAD2.lon);
    expect(n.n).toBeCloseTo(110.77, 0);
    expect(Math.abs(n.e)).toBeLessThan(0.01);
    const e = latLonToEnu(f, PAD2.lat, PAD2.lon + 0.001);
    expect(e.e).toBeCloseTo(100.1, 0);
    expect(Math.abs(e.n)).toBeLessThan(0.01);
    expect(Math.abs(f.east.dot(f.north))).toBeLessThan(1e-12);
    expect(Math.abs(f.east.dot(f.up))).toBeLessThan(1e-12);
  });

  it('goes there and back', () => {
    const p = enuToScene(f, 330.9, -70.8, 140.2);
    const back = sceneToEnu(f, p);
    expect(back.x).toBeCloseTo(330.9, 4);
    expect(back.y).toBeCloseTo(-70.8, 4);
    expect(back.z).toBeCloseTo(140.2, 4);
  });

  it('turns local +X to a bearing', () => {
    for (const b of [0, 90, 123.2, 303.2]) {
      const d = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawFor(b));
      expect(d.distanceTo(bearingDir(b))).toBeLessThan(1e-12);
    }
    // 123.2° points east-south-east: +E, −N (local Z is south, so +Z).
    const d = bearingDir(123.2);
    expect(d.x).toBeGreaterThan(0.8);
    expect(d.z).toBeGreaterThan(0.5);
  });
});
