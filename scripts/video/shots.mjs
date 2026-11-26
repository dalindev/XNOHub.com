// The trailer, shot by shot (about 30 s). Each shot's functions run in the
// page (they're sent as source text), with __film (scripts/video/film-runtime.js)
// and the dev hooks on __xno:
//   setup()   once, before the shot warms up (pick the view, set the clock)
//   hold()    every step while the map tiles load, to keep the opening pose
//   frame(t)  every recorded frame, t seconds into the shot
// Captions are the plan agreed on 2026-11-21: XNOHub · Every node votes →
// Confirmed in about 0.3 s · Real nodes, real places · Ride a Starlink ·
// Launch Starship · Live Nano network · xnohub.com.

const T = (iso) => Date.parse(iso);

export const shots = [
  {
    name: 'approach',
    seconds: 4,
    // Afternoon over the Atlantic: the Americas in daylight, Europe's lights coming on.
    setup: `() => {
      __film.click('Earth');
      __xno.settings.set({ skyLabels: false, slowMo: 1 });
      __xno.clock.setWarp(1);
      __xno.clock.setSimTime(${T('2026-11-20T16:00:00Z')});
    }`,
    hold: `() => { __film.look(30, -20, 9); __xno.clock.setSimTime(${T('2026-11-20T16:00:00Z')}); __film.black(1); }`,
    frame: `(t) => {
      const F = __film, x = F.ease(t / 4);
      F.look(F.lerp(30, 34, x), F.lerp(-20, -38, x), F.lerp(9, 3.4, F.ease(t / 3.6)));
      F.black(1 - F.ease(t / 0.6) + F.ease((t - 3.75) / 0.25));
      F.caption('<span class="xno">ӾNO</span>Hub', 'the Nano network, live', F.window(t, 0.5, 3.8, 0.5));
    }`
  },
  {
    name: 'votes',
    seconds: 6,
    // One block, its votes racing over fibre and Starlink, ten times slower than real.
    setup: `() => {
      __xno.settings.set({ slowMo: 10, mode: 'race' });
      __xno.clock.setSimTime(${T('2026-11-20T16:00:00Z')});
    }`,
    hold: `() => { __film.look(44, -32, 2.5); __xno.clock.setSimTime(${T('2026-11-20T16:00:00Z')}); }`,
    frame: `(t) => {
      const F = __film;
      if (t >= 0.25 && !F.sent) { F.sent = true; __xno.burst(10, 0.1); }
      F.look(44, F.lerp(-32, -26, F.ease(t / 6)), F.lerp(2.5, 2.15, F.ease(t / 6)));
      F.black(1 - F.ease(t / 0.25) + F.ease((t - 5.75) / 0.25));
      if (t < 3.1) F.caption('Every node votes', 'one block, every representative, shown 10× slower', F.window(t, 0.3, 3.1));
      else F.caption('Confirmed in about 0.3 s', 'real latency over real fibre routes', F.window(t, 3.1, 5.9));
    }`
  },
  {
    name: 'sunrise',
    seconds: 5,
    // Dawn sweeping over Europe (an hour in five seconds), meteors overhead.
    setup: `() => {
      __xno.settings.set({ slowMo: 1 });
      __xno.clock.setSimTime(${T('2026-11-20T06:05:00Z')});
      __xno.clock.setWarp(720);
    }`,
    hold: `() => { __film.look(43, -12, 1.42, 47, 14, 0.9); __xno.clock.setSimTime(${T('2026-11-20T06:05:00Z')}); }`,
    frame: `(t) => {
      const F = __film;
      if (t >= 0.4 && !F.meteors) { F.meteors = true; __xno.meteors(); }
      F.look(F.lerp(43, 45, F.ease(t / 5)), F.lerp(-12, -6, F.ease(t / 5)), F.lerp(1.42, 1.34, F.ease(t / 5)), 47, 14, 0.9);
      F.black(1 - F.ease(t / 0.25) + F.ease((t - 4.75) / 0.25));
      F.caption('Real nodes, real places', 'live map imagery, the real Sun, Moon and sky', F.window(t, 0.3, 4.8));
    }`
  },
  {
    name: 'starlink',
    seconds: 5,
    setup: `() => {
      __xno.clock.setWarp(1);
      __xno.clock.setSimTime(${T('2026-11-20T16:00:00Z')});
      __film.click('Ride a Starlink');
    }`,
    hold: `() => { __xno.clock.setSimTime(${T('2026-11-20T16:00:00Z')}); }`,
    frame: `(t) => {
      const F = __film;
      F.black(1 - F.ease(t / 0.25) + F.ease((t - 4.75) / 0.25));
      F.caption('Ride a Starlink', 'real orbits, true scale', F.window(t, 0.3, 4.8));
    }`
  },
  {
    name: 'liftoff',
    seconds: 3,
    // Late morning at Starbase, the real flight clock at 10×.
    setup: `() => {
      __xno.clock.setSimTime(${T('2026-11-20T17:00:00Z')});
      __film.click('Earth');
      __film.click('Launch Starship');
    }`,
    hold: `() => {
      __xno.clock.setSimTime(${T('2026-11-20T17:00:00Z')});
      __film.click('×10');
      __xno.starship(2);
      __xno.shipView({ azimuth: -0.95, elevation: 0.05, distance: 1.25 }); // from the SW: Tower 2 beside the stack, not in front
    }`,
    frame: `(t) => {
      const F = __film;
      F.black(1 - F.ease(t / 0.25) + F.ease((t - 2.8) / 0.2));
      F.caption('Launch Starship', 'Starship V3 on the real flight clock, 10× speed', F.window(t, 0.3, 3.2));
    }`
  },
  {
    name: 'release',
    seconds: 4,
    // In orbit, in daylight over the Atlantic: Starlink V3 satellites leaving the slot in a line, 50×.
    setup: `() => { __film.click('×50'); }`,
    hold: `() => {
      __xno.clock.setSimTime(${T('2026-11-20T13:00:00Z') + 1650 * 1000});
      __xno.starship(1650);
      __xno.shipView({ azimuth: 1.15, elevation: 0.42, distance: 0.85 });
    }`,
    frame: `(t) => {
      const F = __film;
      __xno.shipView({ azimuth: 1.15 + 0.05 * t, elevation: 0.42, distance: 0.85 });
      F.black(1 - F.ease(t / 0.2) + F.ease((t - 3.75) / 0.25));
      F.caption('60 Starlink V3, one by one', 'straight out of the payload slot, 50× speed', F.window(t, 0.2, 3.8));
    }`
  },
  {
    name: 'end',
    seconds: 3,
    setup: `() => {
      __film.click('Earth');
      __xno.starship(1e9); // end the mission, so its marker isn't on the globe
      __xno.clock.setWarp(1);
      __xno.clock.setSimTime(${T('2026-11-20T16:00:00Z')});
    }`,
    hold: `() => { __film.look(26, -55, 4.2); __xno.clock.setSimTime(${T('2026-11-20T16:00:00Z')}); }`,
    frame: `(t) => {
      const F = __film;
      F.look(26, F.lerp(-55, -62, t / 3), 4.2);
      F.black(1 - F.ease(t / 0.25) + F.ease((t - 2.5) / 0.5));
      F.caption('Live Nano network', 'xnohub.com', F.window(t, 0.2, 2.7));
    }`
  }
];
