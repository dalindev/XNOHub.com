'use client';

import { useSyncExternalStore } from 'react';

// Real clouds: NASA's daily true-colour mosaic of the whole Earth from the
// VIIRS instrument on NOAA-21 (each place photographed at about 13:30 local
// time), served by NASA GIBS: free, no key, CORS-enabled. The cloud layer
// keeps only what is white in that picture (cloud, and snow and ice, which
// are white anyway) and relights it with the simulated Sun.
//
// The mosaic for a UTC day is complete a few hours after the day ends, so the
// newest complete one is yesterday's (the day before, in the first hours after
// midnight UTC). Polar night is black in it: no clouds are drawn there, which
// is where the render is dark anyway.
//
// Credit: imagery from NASA's Global Imagery Browse Services (GIBS), part of
// NASA's Earth Science Data and Information System (ESDIS).

const WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const LAYERS = ['VIIRS_NOAA21_CorrectedReflectance_TrueColor', 'VIIRS_NOAA20_CorrectedReflectance_TrueColor'];
const COMPLETE_AFTER_UTC_HOUR = 5;

/** The newest UTC day whose mosaic should be complete, as YYYY-MM-DD. */
export function cloudDay(now = new Date()): string {
  const back = now.getUTCHours() >= COMPLETE_AFTER_UTC_HOUR ? 1 : 2;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - back)).toISOString().slice(0, 10);
}

/** 4096 px wide on large screens (2 MB), 2048 otherwise or on data-saver (0.55 MB). */
export function cloudWidth(): number {
  if (typeof window === 'undefined') return 2048;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return window.innerWidth * (window.devicePixelRatio || 1) >= 1600 && !saveData ? 4096 : 2048;
}

/** Image URLs to try in order (NOAA-21 first, NOAA-20 as the backup satellite). */
export function cloudImageUrls(day: string, width: number): string[] {
  return LAYERS.map(
    (layer) =>
      `${WMS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&CRS=EPSG:4326&BBOX=-90,-180,90,180` +
      `&LAYERS=${layer}&TIME=${day}&WIDTH=${width}&HEIGHT=${width / 2}&FORMAT=image/jpeg`
  );
}

/** What the cloud layer is showing: a day's real clouds, or the bundled picture if NASA can't be reached. */
export interface CloudSource {
  state: 'loading' | 'live' | 'archive';
  /** YYYY-MM-DD of the imagery when live. */
  day: string | null;
}

let source: CloudSource = { state: 'loading', day: null };
const listeners = new Set<() => void>();

export function setCloudSource(next: CloudSource) {
  if (next.state === source.state && next.day === source.day) return;
  source = next;
  listeners.forEach((l) => l());
}

export function useCloudSource() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => source,
    () => source
  );
}
