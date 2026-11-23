import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { adapt, afterDecline, exposureFor, litFor, lookPixelRatio, starGainFor } from '@/lib/camera-look';

describe('camera look', () => {
  it('exposes for sunlight and opens up half a stop at night', () => {
    expect(exposureFor(0)).toBe(2.4);
    expect(exposureFor(1)).toBeCloseTo(3.394, 3);
  });

  it('records stars only at full night gain', () => {
    expect(starGainFor(0)).toBe(0);
    expect(starGainFor(0.5)).toBe(0);
    expect(starGainFor(1)).toBeCloseTo(0.6, 9);
  });

  it('adapts in about a second and jumps after a pause', () => {
    expect(adapt(0, 1, 1 / 60)).toBeCloseTo(0.0408, 3);
    expect(adapt(0, 1, 0.6)).toBe(1);
    expect(adapt(0, 1, 0.3)).toBeCloseTo(0.2212, 3);
    let n = 0;
    for (let i = 0; i < 120; i++) n = adapt(n, 1, 1 / 60);
    expect(n).toBeGreaterThan(0.99);
  });

  it('keeps the Starship view near a 1080p frame, big screens at 100% included', () => {
    expect(lookPixelRatio(1440, 900) ** 2 * 1440 * 900).toBeCloseTo(2.1e6, -3);
    // Below 1 on a big screen: a 4K monitor at 100% draws about a 1080p frame, not 8 MP.
    expect(lookPixelRatio(2560, 1440) ** 2 * 2560 * 1440).toBeCloseTo(2.1e6, -3);
    expect(lookPixelRatio(3840, 2160)).toBeCloseTo(0.503, 3);
    expect(lookPixelRatio(7680, 4320)).toBe(0.5);
    expect(lookPixelRatio(390, 844)).toBeGreaterThan(2);
  });

  it('takes a slow Starship view out on its own pixels, not on the other views', () => {
    // In the Starship view: only its own factor drops; the globe keeps its sharpness.
    expect(afterDecline(true, 2, 1)).toEqual({ sharpness: 2, lookScale: 0.85 });
    expect(afterDecline(true, 2, 0.55).lookScale).toBe(0.5);
    // Elsewhere, as before: half a step of sharpness, never below 1.
    expect(afterDecline(false, 2, 1)).toEqual({ sharpness: 1.5, lookScale: 1 });
    expect(afterDecline(false, 1, 1).sharpness).toBe(1);
  });

  it('meters the Sun on the camera and the sky round it', () => {
    const sun = new THREE.Vector3(0, 0, 1);
    expect(litFor(new THREE.Vector3(0, 0, 1.05), sun, 0)).toBe(1);
    // Over the night side, in the Earth's shadow.
    expect(litFor(new THREE.Vector3(0, 0, -1.05), sun, 0)).toBe(0);
    // Through the soft edge of the shadow.
    const edge = litFor(new THREE.Vector3(0, 1.003, -0.5), sun, 0);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(1);
    // Under a daytime sky the sky decides.
    expect(litFor(new THREE.Vector3(0, 0, -1.001), sun, 0.7)).toBe(0.7);
  });
});
