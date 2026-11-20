'use client';

import { useSyncExternalStore } from 'react';

// Live space weather from NOAA's Space Weather Prediction Center (public
// domain, CORS-enabled, no key):
//  - OVATION aurora forecast: the chance of visible aurora for every 1° of
//    the globe, 30–90 minutes ahead, refreshed every few minutes (~150 KB).
//  - Planetary K index: how disturbed Earth's magnetic field is, 0 (calm) to 9.
//  - The solar wind as it passes the DSCOVR spacecraft, 1.5 million km
//    sunward of Earth: its speed, and which way its magnetic field points
//    (a few dozen bytes each).
// Fetched when first needed, then every 15 minutes while the tab is visible.

const OVATION = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';
const KP = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const WIND_SPEED = 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json';
const WIND_FIELD = 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json';
const REFRESH_MS = 15 * 60_000;

export const AURORA_W = 360;
export const AURORA_H = 181;

export interface SpaceWeather {
  /** Aurora chance in percent, 360 × 181: row = latitude + 90, column = east longitude. */
  aurora: Uint8Array | null;
  /** When the forecast is for (ISO), or null. */
  forecastTime: string | null;
  peakNorth: number;
  peakSouth: number;
  kp: number | null;
  /** Solar wind speed, km/s (about 400 on a quiet day, 700 or more in a fast stream). */
  windKms: number | null;
  /** North-south part of the solar wind's magnetic field, nT. Negative (southward) lets energy into Earth's field. */
  bz: number | null;
  state: 'idle' | 'loading' | 'ready' | 'error';
}

let weather: SpaceWeather = { aurora: null, forecastTime: null, peakNorth: 0, peakSouth: 0, kp: null, windKms: null, bz: null, state: 'idle' };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const publish = (patch: Partial<SpaceWeather>) => {
  weather = { ...weather, ...patch };
  listeners.forEach((l) => l());
};

/** OVATION JSON → grid. Exported for tests. */
export function parseOvation(json: { coordinates?: unknown; 'Forecast Time'?: string }) {
  const grid = new Uint8Array(AURORA_W * AURORA_H);
  let peakNorth = 0, peakSouth = 0;
  if (!Array.isArray(json.coordinates)) throw new Error('OVATION: no coordinates');
  for (const row of json.coordinates as [number, number, number][]) {
    const [lon, lat, value] = row;
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(value)) continue;
    const x = ((Math.round(lon) % 360) + 360) % 360;
    const y = Math.round(lat) + 90;
    if (y < 0 || y >= AURORA_H) continue;
    const v = Math.max(0, Math.min(100, Math.round(value)));
    grid[y * AURORA_W + x] = v;
    // The exact poles carry odd single-cell values; judge the peak below 88°.
    if (Math.abs(lat) < 88) {
      if (lat > 0) peakNorth = Math.max(peakNorth, v);
      else peakSouth = Math.max(peakSouth, v);
    }
  }
  return { grid, peakNorth, peakSouth, forecastTime: json['Forecast Time'] ?? null };
}

/** Latest Kp from NOAA's list (objects or header-plus-rows; both have been published). */
export function parseKp(json: unknown): number | null {
  if (!Array.isArray(json) || !json.length) return null;
  const last = json[json.length - 1];
  const raw = Array.isArray(last) ? last[1] : (last as { Kp?: unknown }).Kp;
  const kp = Number(raw);
  return Number.isFinite(kp) ? kp : null;
}

/** One number from a NOAA summary: `[{ proton_speed: 394, … }]` today, `{ WindSpeed: "394", … }` before 2025. */
function summaryValue(json: unknown, keys: string[]): number | null {
  const row = Array.isArray(json) ? json[json.length - 1] : json;
  if (!row || typeof row !== 'object') return null;
  for (const key of keys) {
    const raw = (row as Record<string, unknown>)[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

/** Solar wind speed in km/s, or null. Readings outside 150 to 3,000 km/s are instrument errors. */
export function parseWindSpeed(json: unknown): number | null {
  const v = summaryValue(json, ['proton_speed', 'WindSpeed']);
  return v !== null && v >= 150 && v <= 3000 ? v : null;
}

/** North-south magnetic field of the solar wind in nT (negative is southward), or null. */
export function parseBz(json: unknown): number | null {
  const v = summaryValue(json, ['bz_gsm', 'Bz']);
  return v !== null && Math.abs(v) <= 200 ? v : null;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * How the aurora is animated for the current space weather.
 *  - pace: how fast everything moves, 1 at a typical 450 km/s solar wind.
 *  - activity: 0 (calm arcs, nearly all green) to 1 (storm: fast rays, red tops, pink lower edge).
 *    Mostly the K index, raised when the solar wind's field points south or the wind is fast,
 *    which is what stirs the aurora up before the K index catches on.
 * Missing readings count as an ordinary quiet day.
 */
export function auroraDrive(w: Pick<SpaceWeather, 'kp' | 'windKms' | 'bz'>) {
  const wind = w.windKms ?? 450;
  const pace = Math.max(0.6, Math.min(2, wind / 450));
  const activity = clamp01(0.55 * ((w.kp ?? 2) / 6) + 0.25 * clamp01(-(w.bz ?? 0) / 10) + 0.2 * clamp01((wind - 350) / 400));
  return { pace, activity };
}

const getJson = (url: string, what: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${what}: HTTP ${r.status}`))));

async function refresh() {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (weather.state === 'idle') publish({ state: 'loading' });
  const [aurora, kp, wind, field] = await Promise.allSettled([getJson(OVATION, 'OVATION'), getJson(KP, 'Kp'), getJson(WIND_SPEED, 'Solar wind speed'), getJson(WIND_FIELD, 'Solar wind field')]);
  const patch: Partial<SpaceWeather> = {};
  if (aurora.status === 'fulfilled') {
    try {
      const a = parseOvation(aurora.value);
      Object.assign(patch, { aurora: a.grid, peakNorth: a.peakNorth, peakSouth: a.peakSouth, forecastTime: a.forecastTime, state: 'ready' });
    } catch (e) {
      console.error(e);
    }
  } else console.error(aurora.reason);
  if (kp.status === 'fulfilled') patch.kp = parseKp(kp.value);
  if (wind.status === 'fulfilled') patch.windKms = parseWindSpeed(wind.value);
  if (field.status === 'fulfilled') patch.bz = parseBz(field.value);
  if (!patch.state && !weather.aurora) patch.state = 'error';
  publish(patch);
}

function start() {
  if (timer || typeof window === 'undefined') return;
  refresh();
  timer = setInterval(refresh, REFRESH_MS);
}

function subscribe(l: () => void) {
  listeners.add(l);
  start();
  return () => {
    listeners.delete(l);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export const spaceWeather = { get: () => weather, subscribe };

// Development only: __xno.weather({ kp: 7, windKms: 750, bz: -18 }) shows a storm until the next refresh.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const w = window as unknown as { __xno?: Record<string, unknown> };
  w.__xno = { ...(w.__xno ?? {}), weather: publish };
}

export function useSpaceWeather() {
  return useSyncExternalStore(subscribe, spaceWeather.get, spaceWeather.get);
}

/** Plain-language activity from Kp. */
export function kpLabel(kp: number) {
  return kp < 3 ? 'quiet' : kp < 4 ? 'unsettled' : kp < 5 ? 'active' : kp < 7 ? 'storm' : 'severe storm';
}
