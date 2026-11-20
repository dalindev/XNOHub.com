'use client';

import { useEffect, useState } from 'react';
import type { RepNode, RepsFile } from '@/types/index';

// The rep list is a static file, refreshed by scripts/build-reps.mjs. Loaded
// once per page and cached here so non-React code can look names up.

let cache: RepsFile | null = null;
let pending: Promise<RepsFile> | null = null;
const byAccount = new Map<string, RepNode>();

export function loadReps(): Promise<RepsFile> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch('/data/reps.json')
    .then((r) => {
      if (!r.ok) throw new Error(`reps.json: HTTP ${r.status}`);
      return r.json() as Promise<RepsFile>;
    })
    .then((file) => {
      cache = file;
      file.reps.forEach((rep) => byAccount.set(rep.account, rep));
      return file;
    })
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

export function useReps(): RepsFile | null {
  const [file, setFile] = useState<RepsFile | null>(cache);
  useEffect(() => {
    if (file) return;
    let live = true;
    loadReps()
      .then((f) => live && setFile(f))
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, [file]);
  return file;
}

export const getRep = (account: string) => byAccount.get(account) ?? null;

export const getRepName = (account: string) => byAccount.get(account)?.alias ?? null;

export const formatWeight = (nano: number) =>
  nano >= 1e6 ? `${(nano / 1e6).toFixed(2)}M Ӿ` : nano >= 1e3 ? `${(nano / 1e3).toFixed(1)}k Ӿ` : `${nano} Ӿ`;
