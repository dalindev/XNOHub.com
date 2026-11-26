import {
  Body,
  EquatorFromVector,
  GeoVector,
  MakeTime,
  RotateVector,
  Rotation_EQJ_EQD,
  SiderealTime
} from 'astronomy-engine';
import * as THREE from 'three';
import { sphericalToUnit, EARTH_RADIUS_KM } from '@/lib/geo';

// Where the Sun and Moon are, in the scene's Earth-fixed frame (see lib/geo).
// Computed from astronomy-engine (VSOP87 / ELP), true equator and equinox of
// date, so the day/night line and the Moon's place match the real sky.

const KM_PER_AU = 149_597_870.7;

export interface BodyFix {
  /** Point on Earth with the body directly overhead. */
  lat: number;
  lon: number;
  /** Unit vector from Earth's centre towards the body (scene frame). */
  direction: THREE.Vector3;
  /** Distance from Earth's centre in Earth radii (scene units). */
  distance: number;
}

function fix(body: Body, date: Date): BodyFix {
  const time = MakeTime(date);
  const eqd = RotateVector(Rotation_EQJ_EQD(time), GeoVector(body, time, true));
  const eq = EquatorFromVector(eqd); // ra (h), dec (deg), dist (AU)
  const gast = SiderealTime(time); // Greenwich apparent sidereal time (h)
  let lon = ((eq.ra - gast) * 15) % 360;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return {
    lat: eq.dec,
    lon,
    direction: sphericalToUnit(eq.dec, lon),
    distance: (eq.dist * KM_PER_AU) / EARTH_RADIUS_KM
  };
}

export const sunFix = (date: Date) => fix(Body.Sun, date);
export const moonFix = (date: Date) => fix(Body.Moon, date);
