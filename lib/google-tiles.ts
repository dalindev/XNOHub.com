// Google Photorealistic 3D Tiles are opt-in. Pricing (checked 2026-11): the
// first 1,000 root-tileset sessions a month are free, then $6 per 1,000.
// Caching tiles is not allowed and Google's attribution must stay on screen.
//
// The real spend cap belongs in Google Cloud: set a daily quota on the Map
// Tiles API for the key. This file is only a per-browser brake so one visitor
// toggling the view can't burn sessions: at most CAP sessions a month here.

const CAP = Number(process.env.NEXT_PUBLIC_GOOGLE_TILES_MONTHLY_CAP ?? 50);
const KEY = 'xno.googleTiles';

const month = () => new Date().toISOString().slice(0, 7);

function read(): { month: string; sessions: number } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && v.month === month()) return v;
  } catch {
    /* storage blocked: treat as fresh */
  }
  return { month: month(), sessions: 0 };
}

export function googleTilesAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  return read().sessions < CAP;
}

export function noteGoogleTilesSession() {
  try {
    const v = read();
    localStorage.setItem(KEY, JSON.stringify({ ...v, sessions: v.sessions + 1 }));
  } catch {
    /* ignore */
  }
}

export const googleTilesConfigured = () => !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
