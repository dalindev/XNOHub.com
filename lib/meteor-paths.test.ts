import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { altitudeKm, grazerPath, meteorPath, showerPath, KM } from '@/lib/meteor-paths';

const end = (p: { start: THREE.Vector3; dir: THREE.Vector3; length: number }) => p.start.clone().addScaledVector(p.dir, p.length);
const over = new THREE.Vector3(0.3, 0.8, -0.52).normalize();

describe('meteor paths', () => {
  it('starts to glow 120 km up and burns out where asked', () => {
    const p = meteorPath(over, 1.2, 90, 40);
    expect(altitudeKm(p.start)).toBeCloseTo(120, 3);
    expect(altitudeKm(end(p))).toBeGreaterThan(79);
    expect(altitudeKm(end(p))).toBeLessThan(82); // a little above 80: the ground curves away
    expect(p.length / KM).toBeCloseTo(90, 6);
  });

  it('never goes underground, however short the path for its drop', () => {
    const p = meteorPath(over, 0, 20, 80);
    expect(altitudeKm(end(p))).toBeGreaterThan(95);
  });

  it('gives a shower parallel paths, and none where the stream only skims past', () => {
    const stream = over.clone().negate();
    const p = showerPath(over, stream, 40, 300)!;
    expect(p.dir.dot(stream)).toBeCloseTo(1, 6);
    expect(altitudeKm(end(p))).toBeCloseTo(80, 1);
    const side = new THREE.Vector3().crossVectors(over, new THREE.Vector3(0, 1, 0)).normalize();
    expect(showerPath(side, stream, 40, 300)).toBeNull();
  });

  it('lets an earthgrazer dip to its lowest point in the middle and leave again', () => {
    const p = grazerPath(over, 2, 90);
    expect(altitudeKm(p.start)).toBeCloseTo(125, 2);
    expect(altitudeKm(end(p))).toBeCloseTo(125, 2);
    expect(altitudeKm(p.start.clone().addScaledVector(p.dir, p.length / 2))).toBeCloseTo(90, 2);
    expect(p.length / KM).toBeGreaterThan(1000);
  });
});
