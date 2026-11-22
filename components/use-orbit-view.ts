'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { METRE } from '@/lib/chase-camera';

// The camera while riding along with something in orbit (a Starlink, the
// Starship): drag to look round it, scroll to move in and out, through a wider
// lens than the globe view. It drifts slowly round until the viewer takes hold.

export const RIDE_FOV = 62; // degrees; the globe view uses 45

export interface OrbitView {
  azimuth: number; // radians round the target, 0 = straight behind
  elevation: number; // radians above its horizon
  distance: number; // multiple of the distance the caller asks for
  /** The viewer has dragged or scrolled: stop moving the camera for them. */
  held: boolean;
}

export function useOrbitView(active: boolean, start: Omit<OrbitView, 'held'>) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const canvas = useThree((s) => s.gl.domElement);
  const view = useRef<OrbitView>({ ...start, held: false });
  const first = useRef(start);

  useEffect(() => {
    if (!active) return;
    const before = camera.fov;
    camera.fov = RIDE_FOV;
    camera.updateProjectionMatrix();
    Object.assign(view.current, first.current, { held: false });
    let dragging = false;
    const down = () => {
      dragging = true;
      view.current.held = true;
    };
    const up = () => (dragging = false);
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const v = view.current;
      v.azimuth -= e.movementX * 0.005;
      v.elevation = THREE.MathUtils.clamp(v.elevation + e.movementY * 0.005, -1.4, 1.4);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = view.current;
      v.held = true;
      v.distance = THREE.MathUtils.clamp(v.distance * Math.exp(e.deltaY * 0.001), 0.3, 15);
    };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
      canvas.removeEventListener('wheel', wheel);
      camera.fov = before;
      camera.updateProjectionMatrix();
    };
  }, [active, camera, canvas]);

  return view;
}

const side = new THREE.Vector3();

/** Put the camera where the view says, `distM` metres (times the view's zoom) from the target. `up` is away from Earth, `fwd` the direction of travel. */
export function placeOrbitCamera(camera: THREE.Camera, target: THREE.Vector3, up: THREE.Vector3, fwd: THREE.Vector3, distM: number, v: OrbitView) {
  side.crossVectors(up, fwd).normalize();
  const d = distM * v.distance * METRE;
  const flat = Math.cos(v.elevation);
  camera.position
    .copy(target)
    .addScaledVector(fwd, -Math.cos(v.azimuth) * flat * d)
    .addScaledVector(side, Math.sin(v.azimuth) * flat * d)
    .addScaledVector(up, Math.sin(v.elevation) * d);
  camera.up.copy(up);
  camera.lookAt(target);
}
