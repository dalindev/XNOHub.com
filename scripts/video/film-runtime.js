// Injected into the page before anything else runs (scripts/video/record.mjs).
// Makes the page a film set:
//  - a virtual clock: performance.now, Date.now and requestAnimationFrame only
//    move when the recorder calls __film.step(ms), so every frame is exactly
//    1/fps apart however slow the capture is (network and timers stay real);
//  - Math.random seeded, so meteors, packets and picks repeat run to run;
//  - the app's UI hidden (but for the imagery credit), a caption layer and a
//    fade-to-black layer on top;
//  - small helpers the shot list uses (scripts/video/shots.mjs).
(() => {
  let now = 0; // virtual ms since the page started
  const realNow = performance.now.bind(performance);
  const start = realNow();
  const dateBase = Date.now();
  performance.now = () => now;
  Date.now = () => dateBase + now;

  let queue = [];
  let nextId = 0;
  window.requestAnimationFrame = (cb) => {
    queue.push({ id: ++nextId, cb });
    return nextId;
  };
  window.cancelAnimationFrame = (id) => {
    queue = queue.filter((q) => q.id !== id);
  };

  let seed = 20261122;
  Math.random = () => {
    // mulberry32
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const D2R = Math.PI / 180;
  const unit = (lat, lon) => {
    const c = Math.cos(lat * D2R);
    return [c * Math.cos(lon * D2R), Math.sin(lat * D2R), -c * Math.sin(lon * D2R)];
  };
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const lerp = (a, b, x) => a + (b - a) * x;
  /** 0 before `a`, up to 1 by `a + fade`, back to 0 from `b - fade` to `b`. */
  const window_ = (t, a, b, fade = 0.4) => Math.min(ease((t - a) / fade), ease((b - t) / fade));

  let shot = null;
  let shotStart = 0;
  let layer, title, sub, black;

  function buildLayers() {
    const style = document.createElement('style');
    style.textContent = `
      body * { visibility: hidden !important; }
      canvas, canvas * { visibility: visible !important; }
      .film-credit, .film-credit * { visibility: visible !important; }
      #film-layer, #film-layer * { visibility: visible !important; }
      #film-layer { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;
        font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; color: #fff; }
      #film-text { position: absolute; left: 6.5%; bottom: 13%; max-width: 70%;
        text-shadow: 0 2px 24px rgba(0,0,0,.65), 0 1px 3px rgba(0,0,0,.6); }
      #film-title { font-size: calc(var(--h) * 0.064); font-weight: 600; letter-spacing: -0.01em; line-height: 1.05; }
      #film-sub { margin-top: calc(var(--h) * 0.014); font-size: calc(var(--h) * 0.027); font-weight: 300; color: #d5dde8; }
      #film-title .xno { color: #209ce9; font-weight: 200; }
      #film-black { position: absolute; inset: 0; background: #000; opacity: 0; }
    `;
    document.head.appendChild(style);
    layer = document.createElement('div');
    layer.id = 'film-layer';
    layer.style.setProperty('--h', `${window.innerHeight}px`);
    layer.innerHTML = '<div id="film-text"><div id="film-title"></div><div id="film-sub"></div></div><div id="film-black"></div>';
    document.body.appendChild(layer);
    title = layer.querySelector('#film-title');
    sub = layer.querySelector('#film-sub');
    black = layer.querySelector('#film-black');
    // Keep the imagery credit: it's owed wherever the map is shown.
    for (const el of document.querySelectorAll('div, span, p')) {
      if (el.childElementCount < 6 && /^Imagery:/.test(el.textContent?.trim() ?? '')) el.classList.add('film-credit');
    }
  }

  const film = {
    /** Advance the virtual clock and run one animation frame. */
    step(ms) {
      now += ms;
      const run = queue;
      queue = [];
      for (const q of run) q.cb(now);
    },
    get now() {
      return now;
    },
    realElapsed: () => realNow() - start,
    ease,
    lerp,
    window: window_,
    unit,
    /** Globe camera at (lat, lon, distance from the centre), looking at (lat, lon, distance). */
    look(lat, lon, dist, tLat = lat, tLon = lon, tDist = 0) {
      const c = window.__xno?.controls;
      if (!c) return false;
      const p = unit(lat, lon).map((v) => v * dist);
      const q = unit(tLat, tLon).map((v) => v * tDist);
      c.setLookAt(p[0], p[1], p[2], q[0], q[1], q[2], false);
      return true;
    },
    caption(t, s = '', alpha = 1) {
      if (!layer) buildLayers();
      if (title.innerHTML !== t) title.innerHTML = t;
      if (sub.textContent !== s) sub.textContent = s;
      layer.querySelector('#film-text').style.opacity = String(alpha);
    },
    black(alpha) {
      if (!layer) buildLayers();
      black.style.opacity = String(alpha);
    },
    click(text) {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === text || x.textContent.includes(text));
      b?.click();
      return !!b;
    },
    /** Start a shot: `s` has setup(), hold() (re-run while warming up) and frame(t). */
    begin(s) {
      if (!layer) buildLayers();
      shot = s;
      shot.setup?.();
    },
    hold() {
      shot?.hold?.();
    },
    /** Record time: t seconds into the shot. */
    frame(t) {
      shot?.frame?.(t);
    }
  };
  window.__film = film;
})();
