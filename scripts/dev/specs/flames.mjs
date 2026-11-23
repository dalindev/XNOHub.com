// Views of the Starship flames, steam, trail and hot staging at the moments and
// angles of the reference photos in docs/flames.md, for scripts/dev/probe.mjs.
// Daylight (09:00 at Starbase) unless LAUNCH_ISO says otherwise.
//   node scripts/dev/probe.mjs scripts/dev/specs/flames.mjs video/out/flames
// GROUP=plume|steam|trail|staging picks a set; ONLY=name,name picks views.
// Each view is held still (__xno.hold, __xno.freezeFlames) so frames compare.
const LAUNCH = Date.parse(process.env.LAUNCH_ISO ?? '2026-11-20T15:00:00Z');
// The beach at the south end of South Padre Island, 8 km north of the pad: where most launch photos are taken.
const SPI = { lat: 26.068, lon: -97.157, hM: 5 };
const PAD = (hM) => ({ lat: 25.997, lon: -97.157, hM });
const STAGING = { lat: 25.9954, lon: -96.4745, hM: 67000 };
const click = (t) => `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '${t}' || b.textContent.includes('${t}'))?.click()`;
// A spotter view (a fixed camera on the ground or beside a vehicle) is set from the chase camera.
const at = (met, spot, extra = '') =>
  `__xno.clock.setSimTime(${LAUNCH} + ${met} * 1000); __xno.starship(${met}); __xno.hold(true); __xno.freezeFlames(true); ${spot ? "__xno.shipCam('chase');" : ''} __xno.spotter(${JSON.stringify(spot)}); ${extra}; await new Promise((r) => setTimeout(r, 3500));
   const i = __xno.flameInfo(), b = i.booster;
   return { calls: i.calls, booster: { on: +b.on.toFixed(2), length: Math.round(b.length), nodes: +b.nodes.toFixed(2) }, meco: i.mecoPlume, vents: i.vents, steam: __xno.steam() };`;
const chase = (azimuth, elevation, distance) => `__xno.shipCam('chase'); __xno.shipView({ azimuth: ${azimuth}, elevation: ${elevation}, distance: ${distance} })`;

const GROUPS = {
  plume: [
    { name: 'p-pad-close', js: at(3, { target: 'booster', rel: [140, 20, 0], aim: -40, fov: 50 }) },
    { name: 'p-spi-liftoff', js: at(8, { target: 'booster', at: SPI, aim: -60, fov: 2.3 }) },
    { name: 'p-spi-28s', js: at(28, { target: 'booster', at: SPI, aim: -130, fov: 2.5 }) },
    { name: 'p-spi-maxq', js: at(62, { target: 'booster', at: SPI, aim: -110, fov: 1.0 }) },
    { name: 'p-spi-85s', js: at(85, { target: 'booster', at: SPI, aim: -120, fov: 0.8 }) },
    { name: 'p-spi-140s', js: at(140, { target: 'booster', at: SPI, aim: -150, fov: 0.4 }) },
    { name: 'p-chase-8', js: at(8, null, chase(0.95, 0.05, 1.25)) },
    { name: 'p-chase-62', js: at(62, null, chase(1.1, 0.12, 1)) },
    { name: 'p-chase-120', js: at(120, null, chase(1.1, 0.12, 1)) },
    { name: 'p-boostback', js: at(190, { target: 'booster', rel: [150, 60, 0], aim: -40, fov: 60 }) },
    { name: 'p-landing', js: at(395, { target: 'booster', rel: [120, -10, 0], aim: -20, fov: 45 }) }
  ],
  steam: [
    { name: 'st-spi-2', js: at(2, { target: 'booster', at: SPI, look: PAD(80), fov: 6.5 }) },
    { name: 'st-spi-8', js: at(8, { target: 'booster', at: SPI, aim: -60, fov: 2.3 }) },
    { name: 'st-chase-0', js: at(0, null, chase(0.95, 0.05, 1.25)) },
    { name: 'st-chase-8', js: at(8, null, chase(0.95, 0.05, 1.25)) },
    { name: 'st-near-3', js: at(3, { target: 'booster', rel: [320, 25, 0], aim: 20, fov: 55 }) },
    { name: 'st-spi-60', js: at(60, { target: 'booster', at: SPI, look: PAD(300), fov: 12 }) },
    { name: 'st-spi-300', js: at(300, { target: 'booster', at: SPI, look: PAD(900), fov: 25 }) }
  ],
  trail: [
    { name: 'tr-spi-79', js: at(79, { target: 'booster', at: SPI, aim: -250, fov: 1.6 }) },
    { name: 'tr-spi-100', js: at(100, { target: 'booster', at: SPI, aim: -800, fov: 4 }) },
    { name: 'tr-chase-90', js: at(90, null, chase(2.6, -0.25, 1.6)) },
    { name: 'tr-wide-150', js: at(150, { target: 'booster', at: SPI, look: { lat: 26.0, lon: -96.95, hM: 15000 }, fov: 40 }) },
    { name: 'tr-wide-400', js: at(400, { target: 'booster', at: SPI, look: { lat: 26.0, lon: -96.95, hM: 15000 }, fov: 40 }) }
  ],
  staging: [
    { name: 'me-side-155.9', js: at(155.9, { target: 'booster', rel: [260, -60, 0], aim: -120, fov: 60 }) },
    { name: 'me-side-156.2', js: at(156.2, { target: 'booster', rel: [260, -60, 0], aim: -120, fov: 60 }) },
    { name: 'me-side-157', js: at(157, { target: 'booster', rel: [260, -60, 0], aim: -120, fov: 60 }) },
    { name: 'vt-side-158.6', js: at(158.6, { target: 'booster', rel: [38, 74, 22], aim: 70.5, fov: 55 }) },
    { name: 'vt-side-159.3', js: at(159.3, { target: 'booster', rel: [38, 74, 22], aim: 70.5, fov: 55 }) },
    { name: 'vt-side-160', js: at(160, { target: 'booster', rel: [60, 80, 35], aim: 74, fov: 60 }) },
    { name: 'vt-flap-158.6', js: at(158.6, null, `__xno.shipCam('flap')`) },
    { name: 'vt-flap-159.5', js: at(159.5, null, `__xno.shipCam('flap')`) },
    { name: 'vt-booster-158.6', js: at(158.6, null, `__xno.shipCam('booster')`) },
    { name: 'vt-booster-159.5', js: at(159.5, null, `__xno.shipCam('booster')`) },
    { name: 'vt-ground-158.6', js: at(158.6, { target: 'booster', at: SPI, aim: 71, fov: 0.05 }) },
    { name: 'vt-ground-161', js: at(161, { target: 'booster', at: SPI, aim: 71, fov: 0.6 }) },
    { name: 'vt-wide-161', js: at(161, { target: 'booster', rel: [500, 300, 250], aim: 60, fov: 60 }) },
    { name: 'vt-wide-168', js: at(168, { target: 'booster', rel: [1800, 600, 900], aim: 0, fov: 60 }) },
    { name: 'vt-ring-168', js: at(168, { target: 'booster', at: SPI, look: STAGING, fov: 1.2 }) },
    { name: 'vt-ring-200', js: at(200, { target: 'booster', at: SPI, look: STAGING, fov: 1.2 }) }
  ]
};

const group = process.env.GROUP;
if (group && !GROUPS[group]) throw new Error(`GROUP must be one of ${Object.keys(GROUPS).join(', ')}`);
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const views = (group ? GROUPS[group] : Object.values(GROUPS).flat())
  .filter((v) => !only || only.has(v.name))
  .map((v) => ({ ...v, shot: true }));

const spec = {
  steps: [
    // Into the Starship view on a real-time clock, a few seconds before engine start.
    { js: `__xno.clock.setSimTime(${LAUNCH} - 5000); ${click('Launch Starship')}; await new Promise((r) => setTimeout(r, 1500)); ${click('real')};`, wait: 1000 },
    ...views
  ]
};
export default spec;
