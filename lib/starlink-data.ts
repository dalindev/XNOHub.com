'use client';

import { useEffect, useState } from 'react';
import type { StarlinkFile } from '@/lib/orbits';

// public/data/starlink.json (scripts/build-starlink.mjs), loaded once per page.
let cache: StarlinkFile | null = null;
let pending: Promise<StarlinkFile> | null = null;

export function loadStarlink(): Promise<StarlinkFile> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch('/data/starlink.json')
    .then((r) => {
      if (!r.ok) throw new Error(`starlink.json: HTTP ${r.status}`);
      return r.json() as Promise<StarlinkFile>;
    })
    .then((f) => (cache = f))
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

export function useStarlink(): StarlinkFile | null {
  const [file, setFile] = useState<StarlinkFile | null>(cache);
  useEffect(() => {
    if (file) return;
    let live = true;
    loadStarlink()
      .then((f) => live && setFile(f))
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, [file]);
  return file;
}
