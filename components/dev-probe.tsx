'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

// Development only: exposes the renderer and camera as window.__xno.gl / .camera / .controls so draw calls,
// GPU memory and frame timing can be checked from the console.
export function DevProbe() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as { __xno?: Record<string, unknown> };
    w.__xno = { ...(w.__xno ?? {}), gl, camera, controls, scene };
  }, [gl, camera, controls, scene]);
  return null;
}
