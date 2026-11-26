import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WGS84_ELLIPSOID } from '3d-tiles-renderer';
import { latLonToUnit, unitToLatLon, ellipsoidRadius, sphericalToUnit, EARTH_RADIUS_KM } from './geo';

const D2R = Math.PI / 180;
const M = EARTH_RADIUS_KM * 1000; // metres per scene unit

/** The textbook WGS84 geodetic → ECEF, in the scene frame (x, z, −y), scene units. */
function ecef(lat: number, lon: number) {
  const a = 6378.137, e2 = 6.69437999014e-3;
  const p = lat * D2R, l = lon * D2R, s = Math.sin(p);
  const n = a / Math.sqrt(1 - e2 * s * s);
  const x = n * Math.cos(p) * Math.cos(l), y = n * Math.cos(p) * Math.sin(l), z = n * (1 - e2) * s;
  return new THREE.Vector3(x, z, -y).divideScalar(EARTH_RADIUS_KM);
}

/** Where the map tiles draw the ground at (lat, lon): the tile renderer's own ellipsoid, turned as tiled-earth turns it. */
function onTiles(lat: number, lon: number) {
  const v = WGS84_ELLIPSOID.getCartographicToPosition(lat * D2R, lon * D2R, 0, new THREE.Vector3());
  return new THREE.Vector3(v.x, v.z, -v.y).divideScalar(M);
}

// Equator, Starbase, the Alps, Nuremberg (a rep node), Helsinki, Sydney, near both poles.
const PLACES: [number, number][] = [[0, 0], [25.997, -97.158], [45, 7.5], [49.453, 11.078], [60.17, 24.94], [-33.87, 151.21], [89.9, 0], [-89.9, 45]];

const groundPoint = (lat: number, lon: number) => latLonToUnit(lat, lon).multiplyScalar(ellipsoidRadius(lat));

describe('map coordinates on the WGS84 Earth', () => {
  it('puts a place where the textbook formula does, to within a metre', () => {
    for (const [lat, lon] of PLACES) expect(groundPoint(lat, lon).distanceTo(ecef(lat, lon)) * M).toBeLessThan(1);
  });

  it('puts a place on the map tiles where they draw it (it was 21 km north at Nuremberg)', () => {
    for (const [lat, lon] of PLACES) {
      // The direction is what markers use (they float at a fixed height along it).
      const km = latLonToUnit(lat, lon).angleTo(onTiles(lat, lon)) * EARTH_RADIUS_KM;
      expect(km).toBeLessThan(0.001);
      expect(groundPoint(lat, lon).distanceTo(onTiles(lat, lon)) * M).toBeLessThan(1);
    }
  });

  it('reads back the map latitude of the ground under a point, at any height (terrain is sampled there)', () => {
    for (const [lat, lon] of PLACES) {
      for (const r of [1, 1.0022, 1.5, 9]) {
        const back = unitToLatLon(latLonToUnit(lat, lon).multiplyScalar(r));
        expect(back.lat).toBeCloseTo(lat, 9);
        expect(back.lon).toBeCloseTo(lon, 9);
      }
      expect(unitToLatLon(onTiles(lat, lon)).lat).toBeCloseTo(lat, 6);
    }
  });

  it('leaves sky directions spherical', () => {
    expect(sphericalToUnit(30, 0).y).toBeCloseTo(0.5, 12);
    expect(sphericalToUnit(-23.44, 0).y).toBeCloseTo(Math.sin(-23.44 * D2R), 12);
    expect(sphericalToUnit(90, 0).y).toBeCloseTo(1, 12);
  });
});
