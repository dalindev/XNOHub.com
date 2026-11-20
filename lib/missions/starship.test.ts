import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMissionState, missionAt, PAD, ORBIT_S, DEPLOY_S, MISSION_END_S } from './starship';
import { latLonToUnit, EARTH_RADIUS_KM } from '../geo';

const axis = (q: THREE.Quaternion, x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyQuaternion(q);

describe('Starship mission', () => {
  it('lifts off from Starbase pointing up', () => {
    const s = missionAt(0.01, createMissionState());
    const pad = latLonToUnit(PAD.lat, PAD.lon);
    expect(s.ship.pos.clone().normalize().angleTo(pad)).toBeLessThan(1e-3);
    expect(axis(s.ship.quat, 0, 1, 0).dot(pad)).toBeGreaterThan(0.99);
  });

  it('flies level in orbit with the slot side facing away from Earth', () => {
    const s = missionAt(DEPLOY_S + 5, createMissionState());
    const up = s.ship.pos.clone().normalize();
    expect(s.ship.altKm).toBeCloseTo(230);
    expect(Math.abs(axis(s.ship.quat, 0, 1, 0).dot(up))).toBeLessThan(0.05); // nose horizontal
    expect(axis(s.ship.quat, 0, 0, 1).dot(up)).toBeGreaterThan(0.95); // PEZ slot up
    expect(s.phase).toBe('deploying');
    expect(s.deployed).toBeGreaterThan(0);
  });

  it('moves at orbital speed in real time once in orbit', () => {
    const a = missionAt(ORBIT_S + 10, createMissionState()).ship.pos.clone();
    const b = missionAt(ORBIT_S + 11, createMissionState()).ship.pos.clone();
    const kmPerS = a.distanceTo(b) * EARTH_RADIUS_KM;
    expect(kmPerS).toBeGreaterThan(7.5);
    expect(kmPerS).toBeLessThan(8.3);
  });

  it('brings the booster back to the pad', () => {
    const s = missionAt(ORBIT_S - 2, createMissionState());
    const pad = latLonToUnit(PAD.lat, PAD.lon);
    expect(s.booster.pos.clone().normalize().angleTo(pad) * EARTH_RADIUS_KM).toBeLessThan(2);
    expect(s.booster.altKm).toBeLessThan(1);
    expect(missionAt(MISSION_END_S + 1, createMissionState()).phase).toBe('done');
  });
});
