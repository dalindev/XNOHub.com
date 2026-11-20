'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';

// One camera, one owner at a time. In 'globe' mode CameraControls owns it.
// In 'follow' mode (rocket, Starlink) the controls are unmounted, so the
// follower is the only thing writing the camera and nothing fights it. When
// the globe takes it back, the controls glide from wherever the camera is.

export type CameraMode = 'globe' | 'follow' | 'fly';

interface CameraDirectorProps {
  mode: CameraMode;
  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>;
  /** Bump to ask the globe view to fly home. */
  homeSignal?: number;
}

const HOME_DISTANCE = 4.5;

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
    const dir = camera.position.clone();
    if (dir.lengthSq() < 1e-6) dir.set(0, 2, 4);
    dir.setLength(Math.max(HOME_DISTANCE, Math.min(dir.length(), 12)));
    controls.current.setLookAt(dir.x, dir.y, dir.z, 0, 0, 0, true);
  }, [mode, homeSignal, camera]);

  if (mode !== 'globe') return null;
  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={1.15}
      maxDistance={60}
      smoothTime={0.35}
      draggingSmoothTime={0.12}
      azimuthRotateSpeed={0.5}
      polarRotateSpeed={0.5}
      dollySpeed={0.6}
      truckSpeed={0}
    />
  );
};
