'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { world } from '@/lib/world';
import { unitToLatLon, latLonToUnit, ellipsoidRadius } from '@/lib/geo';

// Free flight, drone style: the horizon stays level (no roll), "up" is always
// away from Earth's centre. Speed scales with altitude so you can cross a
// continent from orbit and still creep along a valley.
//   Mouse (click to capture) look · WASD move · Space/E up · Shift/Q down
//   Wheel or +/- speed · Gamepad: left stick move, right stick look, triggers up/down

const MIN_CLEARANCE = 30 / 6_371_000; // 30 m above ground
const LOOK_SPEED = 0.0022;
const PAD_LOOK = 2.2; // rad/s at full stick

const pressed = new Set<string>();

export const FlyControls: React.FC = () => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const heading = useRef(0); // rad, 0 = north, + = east
  const pitch = useRef(-1.2); // rad, start looking well down at the Earth
  const speedMul = useRef(1);
  const posed = useRef(false);

  useEffect(() => {
    // Start from a deep-link pose if there is one, else facing north and
    // looking down at whatever is below the camera.
    // (Once per mount: strict mode re-runs this effect and must not reset the pose.)
    const start = world.flyStart;
    if (posed.current) {
      // already posed
    } else if (start) {
      world.flyStart = null;
      const r = ellipsoidRadius(start.lat) + start.altKm / 6371;
      latLonToUnit(start.lat, start.lon, camera.position).multiplyScalar(r);
      heading.current = THREE.MathUtils.degToRad(start.heading);
      pitch.current = THREE.MathUtils.degToRad(start.pitch);
    } else {
      heading.current = 0;
      pitch.current = -1.2;
    }
    posed.current = true;
    const el = gl.domElement;
    const onDown = (e: KeyboardEvent) => {
      pressed.add(e.code);
      if (e.code === 'Equal' || e.code === 'NumpadAdd') speedMul.current = Math.min(speedMul.current * 2, 64);
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') speedMul.current = Math.max(speedMul.current / 2, 1 / 64);
    };
    const onUp = (e: KeyboardEvent) => pressed.delete(e.code);
    const onClick = () => el.requestPointerLock?.();
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      heading.current += e.movementX * LOOK_SPEED;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * LOOK_SPEED, -1.55, 1.55);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      speedMul.current = THREE.MathUtils.clamp(speedMul.current * (e.deltaY > 0 ? 0.8 : 1.25), 1 / 64, 64);
    };
    const onBlur = () => pressed.clear();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    el.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMove);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      el.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMove);
      el.removeEventListener('wheel', onWheel);
      if (document.pointerLockElement === el) document.exitPointerLock();
      pressed.clear();
    };
  }, [gl, camera]);

  const v = useRef({
    up: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    flatFwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    move: new THREE.Vector3(),
    target: new THREE.Vector3()
  });

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const { up, east, north, fwd, flatFwd, right, move, target } = v.current;
    const pos = camera.position;

    // Local frame at the camera: up, east, north.
    up.copy(pos).normalize();
    east.set(0, 1, 0).cross(up);
    if (east.lengthSq() < 1e-10) east.set(1, 0, 0); // over a pole
    east.normalize();
    north.copy(up).cross(east).normalize();

    // Gamepad (first connected one).
    const pad = typeof navigator !== 'undefined' ? navigator.getGamepads?.().find(Boolean) : null;
    const dz = (x: number) => (Math.abs(x) < 0.15 ? 0 : x);
    let padX = 0, padY = 0, padRise = 0;
    if (pad) {
      padX = dz(pad.axes[0] ?? 0);
      padY = dz(pad.axes[1] ?? 0);
      heading.current += dz(pad.axes[2] ?? 0) * PAD_LOOK * dt;
      pitch.current = THREE.MathUtils.clamp(pitch.current - dz(pad.axes[3] ?? 0) * PAD_LOOK * dt, -1.55, 1.55);
      padRise = (pad.buttons[7]?.value ?? 0) - (pad.buttons[6]?.value ?? 0);
    }

    // Look direction from heading/pitch in the local frame.
    flatFwd.copy(north).multiplyScalar(Math.cos(heading.current)).addScaledVector(east, Math.sin(heading.current));
    right.copy(flatFwd).cross(up).normalize();
    fwd.copy(flatFwd).multiplyScalar(Math.cos(pitch.current)).addScaledVector(up, Math.sin(pitch.current));

    // Movement.
    const k = (c: string) => (pressed.has(c) ? 1 : 0);
    const forward = k('KeyW') - k('KeyS') - padY;
    const strafe = k('KeyD') - k('KeyA') + padX;
    const rise = k('Space') + k('KeyE') - k('ShiftLeft') - k('ShiftRight') - k('KeyQ') + padRise;
    const { lat } = unitToLatLon(pos);
    const surface = ellipsoidRadius(lat) + (world.groundAltitude ?? 0);
    const height = Math.max(pos.length() - surface, MIN_CLEARANCE);
    const speed = Math.max(height * 0.8, 2 / 6_371_000) * speedMul.current; // ~0.8 × altitude per second
    move.set(0, 0, 0)
      .addScaledVector(fwd, forward)
      .addScaledVector(right, strafe)
      .addScaledVector(up, rise);
    if (move.lengthSq() > 0) pos.addScaledVector(move.normalize(), speed * dt);

    // Never below the ground, never past the Moon.
    const minR = surface + MIN_CLEARANCE;
    if (pos.length() < minR) pos.setLength(minR);
    if (pos.length() > 70) pos.setLength(70);

    camera.up.copy(up);
    camera.lookAt(target.copy(pos).add(fwd));
  });

  return null;
};
