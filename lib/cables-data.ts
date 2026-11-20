'use client';

import { useEffect, useState } from 'react';
import type { CablesFile } from '@/lib/routing/fiber';

// public/data/cables.json (scripts/build-cables.mjs), loaded once per page.
let cache: CablesFile | null = null;
let pending: Promise<CablesFile> | null = null;

export function loadCables(): Promise<CablesFile> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch('/data/cables.json')
    .then((r) => {
      if (!r.ok) throw new Error(`cables.json: HTTP ${r.status}`);
      return r.json() as Promise<CablesFile>;
    })
    .then((f) => (cache = f))
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

export function useCables(): CablesFile | null {
  const [file, setFile] = useState<CablesFile | null>(cache);
  useEffect(() => {
    if (file) return;
    let live = true;
    loadCables()
      .then((f) => live && setFile(f))
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, [file]);
  return file;
}
