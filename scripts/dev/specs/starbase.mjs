// Views of Starbase in HD (docs/starbase-plan.md §5) for scripts/dev/probe.mjs.
//   node scripts/dev/probe.mjs scripts/dev/specs/starbase.mjs video/out/starbase
// LAUNCH_ISO sets the light (default 2026-11-20T17:00Z, late morning at the pad);
// ONLY=name,name picks views. Each view holds the mission still at its time.
const LAUNCH = Date.parse(process.env.LAUNCH_ISO ?? '2026-11-20T17:00:00Z');
// Pad 2's mount (lib/sites/starbase.ts ORIGIN), and points round it.
const PAD2 = (hM) => ({ lat: 25.9967665, lon: -97.1580415, hM });
const PAD1 = (hM) => ({ lat: 25.996145, lon: -97.154436, hM });
const at = (met, spot, extra = '') =>
  `__xno.clock.setSimTime(${LAUNCH} + ${met} * 1000); __xno.starship(${met}); __xno.hold(true); __xno.freezeFlames(true); ${spot ? "__xno.shipCam('chase');" : ''} __xno.spotter(${JSON.stringify(spot)}); ${extra}; await new Promise((r) => setTimeout(r, 4000));
   const r = __xno.gl.info.render; return { calls: r.calls, tris: r.triangles, site: __xno.site?.check?.() };`;
const chase = (azimuth, elevation, distance) => `__xno.shipCam('chase'); __xno.shipView({ azimuth: ${azimuth}, elevation: ${elevation}, distance: ${distance} })`;

const VIEWS = [
  // Pad 2 and Tower 2 from 260 m SW, 60 m up (V3).
  { name: 'v3-pad2', js: at(-4, { target: 'booster', at: { lat: 25.99524, lon: -97.15988, hM: 60 }, look: PAD2(60), fov: 50 }) },
  // The same at liftoff.
  { name: 'v3-liftoff', js: at(3, { target: 'booster', at: { lat: 25.99524, lon: -97.15988, hM: 60 }, look: PAD2(60), fov: 50 }) },
  // Close on the mount and the base of the stack, from the trench's NW exit side.
  { name: 'mount-close', js: at(-4, { target: 'booster', at: { lat: 25.99715, lon: -97.15855, hM: 25 }, look: PAD2(18), fov: 55 }) },
  // Pad 1 and Tower 1 (VP1).
  { name: 'vp1-pad1', js: at(-4, { target: 'booster', at: { lat: 25.99275, lon: -97.1558, hM: 80 }, look: PAD1(40), fov: 55 }) },
  // The whole site from the SW, 700 m up (V1).
  { name: 'v1-site', js: at(-4, { target: 'booster', at: { lat: 25.99066, lon: -97.16389, hM: 700 }, look: PAD2(0), fov: 45 }) },
  // A ground observer 1.3 km WSW (VG).
  { name: 'vg-ground', js: at(-4, { target: 'booster', at: { lat: 25.99441, lon: -97.17076, hM: 40 }, look: PAD2(70), fov: 30 }) },
  // The chase camera's liftoff framing (VC) and its default (VCd).
  { name: 'vc-minus4', js: at(-4, null, chase(-0.95, 0.05, 1.25)) },
  { name: 'vc-plus4', js: at(4, null, chase(-0.95, 0.05, 1.25)) },
  { name: 'vcd-plus12', js: at(12, null, chase(-1.1, 0.12, 1)) }
];

const click = (t) => `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '${t}' || b.textContent.includes('${t}'))?.click()`;
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const spec = {
  steps: [
    // Into the Starship view on a real-time clock, a few seconds before engine start.
    { js: `__xno.clock.setSimTime(${LAUNCH} - 5000); ${click('Launch Starship')}; await new Promise((r) => setTimeout(r, 1500)); ${click('real')};`, wait: 1000 },
    ...VIEWS.filter((v) => !only || only.has(v.name)).map((v) => ({ ...v, shot: true }))
  ]
};
export default spec;
