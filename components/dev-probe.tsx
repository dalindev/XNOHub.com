'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

// Development only: exposes the renderer as window.__xno.gl so draw calls,
// GPU memory and frame timing can be checked from the console.
export function DevProbe() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as { __xno?: Record<string, unknown> };
    w.__xno = { ...(w.__xno ?? {}), gl };
  }, [gl]);
  return null;
}
