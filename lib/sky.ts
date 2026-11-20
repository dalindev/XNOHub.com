import { Body, GeoVector, Illumination, MakeTime, RotateVector, Rotation_EQJ_EQD, SiderealTime, Vector } from 'astronomy-engine';
import * as THREE from 'three';

// The real night sky. Stars and planets are placed in a "sky frame": J2000
// equatorial axes (X to RA 0h, Y to RA 6h, Z to the north celestial pole)
// mapped to three.js as (X, Z, -Y), the same mapping lib/geo uses for the
// Earth. skyOrientation() then turns that frame to where the sky really is
// over the Earth-fixed scene at a given moment (precession, nutation and the
// Earth's rotation), so the right stars are over the right places.

const D2R = Math.PI / 180;

/** Unit vector for a J2000 right ascension and declination (degrees), in the sky frame. */
export function raDecToSky(raDeg: number, decDeg: number, out = new THREE.Vector3()) {
  const a = raDeg * D2R, d = decDeg * D2R, c = Math.cos(d);
  return out.set(c * Math.cos(a), Math.sin(d), -c * Math.sin(a));
}

const m4 = new THREE.Matrix4();
const cols = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
// Sky-frame basis vectors written as J2000 (x, y, z): three (X, Y, Z) = J2000 (x, z, -y).
const BASIS_J2000: [number, number, number][] = [
  [1, 0, 0],
  [0, 0, 1],
  [0, -1, 0]
];

/** Orientation of the sky frame in the Earth-fixed scene at `date`. */
export function skyOrientation(date: Date, out = new THREE.Quaternion()) {
  const time = MakeTime(date);
  const toDate = Rotation_EQJ_EQD(time); // J2000 → true equator and equinox of date
  const gast = (SiderealTime(time) / 24) * 2 * Math.PI;
  const c = Math.cos(gast), s = Math.sin(gast);
  BASIS_J2000.forEach(([x, y, z], i) => {
    const v = RotateVector(toDate, new Vector(x, y, z, time));
    // Inertial → Earth-fixed (rotate by sidereal angle), then to the scene's axes.
    cols[i].set(v.x * c + v.y * s, v.z, -(-v.x * s + v.y * c));
  });
  m4.makeBasis(cols[0], cols[1], cols[2]);
  return out.setFromRotationMatrix(m4);
}

export interface Planet {
  name: string;
  /** Unit direction in the sky frame. */
  direction: THREE.Vector3;
  /** Apparent visual magnitude right now. */
  magnitude: number;
  color: number;
}

// The five naked-eye planets, with roughly their visual colours.
const PLANETS: [Body, string, number][] = [
  [Body.Mercury, 'Mercury', 0xd9cfc4],
  [Body.Venus, 'Venus', 0xfff8e6],
  [Body.Mars, 'Mars', 0xffa070],
  [Body.Jupiter, 'Jupiter', 0xfff1dc],
  [Body.Saturn, 'Saturn', 0xf6e3b4]
];

/** Where the naked-eye planets are, and how bright, as seen from Earth. */
export function planetsAt(date: Date): Planet[] {
  const time = MakeTime(date);
  return PLANETS.map(([body, name, color]) => {
    const v = GeoVector(body, time, true); // J2000, light-time and aberration corrected
    return {
      name,
      direction: new THREE.Vector3(v.x, v.z, -v.y).normalize(),
      magnitude: Illumination(body, time).mag,
      color
    };
  });
}

/** Sun direction in the sky frame (for tests and for placing things consistently). */
export function sunInSky(date: Date, out = new THREE.Vector3()) {
  const v = GeoVector(Body.Sun, MakeTime(date), true);
  return out.set(v.x, v.z, -v.y).normalize();
}

/**
 * Star colour from its B-V index: B-V → temperature (Ballesteros 2012), then
 * a black-body colour (approximation by Tanner Helland), brightest channel 1.
 */
export function starColor(bv: number, out = new THREE.Color()) {
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  const k = THREE.MathUtils.clamp(t, 1500, 40000) / 100;
  const r = k <= 66 ? 255 : 329.698727446 * (k - 60) ** -0.1332047592;
  const g = k <= 66 ? 99.4708025861 * Math.log(k) - 161.1195681661 : 288.1221695283 * (k - 60) ** -0.0755148492;
  const b = k >= 66 ? 255 : k <= 19 ? 0 : 138.5177312231 * Math.log(k - 10) - 305.0447927307;
  const c = (v: number) => THREE.MathUtils.clamp(v, 0, 255) / 255;
  const max = Math.max(c(r), c(g), c(b)) || 1;
  return out.setRGB(c(r) / max, c(g) / max, c(b) / max);
}

/** Brightest stars, for labels (from scripts/build-stars.mjs, checked there). */
export const NAMED_STARS: { name: string; ra: number; dec: number }[] = [
  { name: 'Sirius', ra: 101.2871, dec: -16.7161 },
  { name: 'Canopus', ra: 95.9879, dec: -52.6958 },
  { name: 'Arcturus', ra: 213.9154, dec: 19.1825 },
  { name: 'Alpha Centauri', ra: 219.8996, dec: -60.8353 },
  { name: 'Vega', ra: 279.2346, dec: 38.7836 },
  { name: 'Capella', ra: 79.1725, dec: 45.9981 },
  { name: 'Rigel', ra: 78.6346, dec: -8.2017 },
  { name: 'Procyon', ra: 114.8254, dec: 5.225 },
  { name: 'Betelgeuse', ra: 88.7929, dec: 7.4069 },
  { name: 'Achernar', ra: 24.4288, dec: -57.2367 },
  { name: 'Altair', ra: 297.6958, dec: 8.8683 },
  { name: 'Aldebaran', ra: 68.98, dec: 16.5092 },
  { name: 'Antares', ra: 247.3517, dec: -26.4319 },
  { name: 'Spica', ra: 201.2983, dec: -11.1614 },
  { name: 'Pollux', ra: 116.3287, dec: 28.0261 },
  { name: 'Fomalhaut', ra: 344.4129, dec: -29.6222 },
  { name: 'Deneb', ra: 310.3579, dec: 45.2803 },
  { name: 'Polaris', ra: 37.9529, dec: 89.2642 }
];

/** Decodes public/sky/stars.bin (see scripts/build-stars.mjs). */
export function decodeStars(buffer: ArrayBuffer) {
  const raw = new Int16Array(buffer);
  const n = raw.length / 4;
  const ra = new Float32Array(n), dec = new Float32Array(n), mag = new Float32Array(n), bv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    ra[i] = ((raw[i * 4] + 32768) * 180) / 32768;
    dec[i] = (raw[i * 4 + 1] * 90) / 32767;
    mag[i] = raw[i * 4 + 2] / 1000;
    bv[i] = raw[i * 4 + 3] / 1000;
  }
  return { n, ra, dec, mag, bv };
}
