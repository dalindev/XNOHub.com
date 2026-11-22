'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import { FlyControls } from '@/components/fly-controls';
import { world, ellipsoidRadius } from '@/lib/world';
import { unitToLatLon } from '@/lib/geo';

// One camera, one owner at a time:
//   globe  → CameraControls orbit the Earth
//   follow → a rocket or satellite writes the camera (controls unmounted)
//   fly    → free flight (FlyControls)
// When the globe takes the camera back, the controls glide from wherever it is.
// WorldWatcher keeps the shared altitude and the near plane up to date in every mode.

export type CameraMode = 'globe' | 'follow' | 'fly';

interface CameraDirectorProps {
  mode: CameraMode;
  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>;
  /** Bump to ask the globe view to fly home. */
  homeSignal?: number;
}

const HOME_DISTANCE = 4.5;
// Dragging turns the Earth by about as much ground as the pointer crossed, at
// any height: from far away that is a sixth of a turn per screen, near the
// ground a few kilometres. Zooming changes the height above the ground by the
// same share per wheel step, so it slows down on the way in too. Without this
// both run at the far-away speed, and close up the ground streaks past faster
// than its tiles can load.
const MAX_TURN_SPEED = 0.5;
const ZOOM_SPEED = 0.6;

const WorldWatcher: React.FC = () => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const height = useThree((s) => s.size.height);
  useFrame(() => {
    const distance = camera.position.length();
    world.earthPx = (Math.tan(Math.asin(Math.min(1, 1 / distance))) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * (height / 2);
    const { lat } = unitToLatLon(camera.position);
    const alt = camera.position.length() - ellipsoidRadius(lat) - (world.groundAltitude ?? 0);
    world.altitude = alt;
    // Near plane follows altitude so depth precision stays where the ground is:
    // a tenth of the height above it, from ~0.6 m when skimming terrain. Nothing
    // drawn comes that close to the camera, and from orbit it is what keeps the
    // cables and nodes (a few km up) from flickering against the surface.
    const near = world.nearOverride ?? THREE.MathUtils.clamp(alt * 0.1, 1e-7, 2);
    if (Math.abs(near - camera.near) / camera.near > 0.05) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
  });
  return null;
};

export const CameraDirector: React.FC<CameraDirectorProps> = ({ mode, cameraRef, homeSignal = 0 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useRef<CameraControlsImpl>(null);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera, cameraRef]);

  // Entering globe mode (or pressing Earth View): glide out to a comfortable
  // distance on the side of the Earth the camera is already looking at.
  useEffect(() => {
    if (mode !== 'globe' || !controls.current) return;
    camera.up.set(0, 1, 0);
    controls.current.updateCameraUp();
    const dir = camera.position.clone();
    if (dir.lengthSq() < 1e-6) dir.set(0, 2, 4);
    dir.setLength(Math.max(HOME_DISTANCE, Math.min(dir.length(), 12)));
    controls.current.setLookAt(dir.x, dir.y, dir.z, 0, 0, 0, true);
  }, [mode, homeSignal, camera]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const height = Math.max(world.altitude, 0.002);
    const grab = (height * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.PI;
    c.azimuthRotateSpeed = c.polarRotateSpeed = Math.min(MAX_TURN_SPEED, grab);
    // The controls zoom by a share of the distance to the Earth's centre; this makes it a share of the height.
    c.dollySpeed = ZOOM_SPEED * THREE.MathUtils.clamp((1.3 * height) / camera.position.length(), 0.03, 1);
  });

  return (
    <>
      <WorldWatcher />
      {mode === 'fly' && <FlyControls />}
      {mode === 'globe' && (
        <CameraControls
          ref={controls}
          makeDefault
          minDistance={1.03}
          maxDistance={60}
          smoothTime={0.35}
          draggingSmoothTime={0.12}
          truckSpeed={0}
        />
      )}
    </>
  );
};
