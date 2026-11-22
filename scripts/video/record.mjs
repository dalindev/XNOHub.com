// Records the XNOHub trailer from the running dev server, frame by frame.
//
//   node scripts/video/record.mjs                         # full: 1920x1080, 60 fps, all shots
//   node scripts/video/record.mjs --size 640x360 --fps 30 --shots release --limit 3   # quick test
//
// Options: --url (default http://localhost:3000/), --size WxH, --fps N,
// --shots a,b (names in shots.mjs), --limit seconds (cut each shot),
// --out file.mp4 (default video/out/xnohub-trailer.mp4), --extras (also a
// README cut under 10 MB and a poster image; on by default for a full run).
//
// How: headless Chrome with its own profile kept in video/out/chrome
// (its cache keeps the map tiles, so a second run downloads almost nothing),
// a virtual clock injected before the page loads (film-runtime.js), and each
// frame captured as PNG and piped straight into ffmpeg (no frame files on
// disk). Before each shot it holds the opening pose until the map tiles stop
// loading, then records. Prints the time taken and what was downloaded.
// Needs the dev server (the shots use its __xno hooks) and ffmpeg.
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shots as allShots } from './shots.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const url = arg('url', 'http://localhost:3000/');
const [width, height] = arg('size', '1920x1080').split('x').map(Number);
const fps = Number(arg('fps', 60));
const limit = Number(arg('limit', Infinity));
const pick = arg('shots', '');
const shots = pick ? allShots.filter((s) => pick.split(',').includes(s.name)) : allShots;
const out = arg('out', join(root, 'video/out/xnohub-trailer.mp4'));
const extras = process.argv.includes('--extras') || (!pick && !Number.isFinite(limit));
const profile = join(root, 'video/out/chrome');
await mkdir(dirname(out), { recursive: true });
await mkdir(profile, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--use-angle=metal', '--hide-scrollbars', '--mute-audio', `--window-size=${width},${height}`, 'about:blank'
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
  } catch {}
}
if (!target) throw new Error('Chrome did not start');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const inFlight = new Set();
const hostOf = new Map();
const downloaded = new Map();
let lastNetwork = Date.now();
const errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
    return;
  }
  const p = m.params;
  if (m.method === 'Network.requestWillBeSent') {
    inFlight.add(p.requestId);
    hostOf.set(p.requestId, new URL(p.request.url).host || 'data');
    lastNetwork = Date.now();
  }
  if (m.method === 'Network.loadingFinished' || m.method === 'Network.loadingFailed') {
    inFlight.delete(p.requestId);
    lastNetwork = Date.now();
    const host = hostOf.get(p.requestId);
    if (host && m.method === 'Network.loadingFinished') {
      const d = downloaded.get(host) ?? { n: 0, bytes: 0 };
      downloaded.set(host, { n: d.n + 1, bytes: d.bytes + p.encodedDataLength });
    }
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const run = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(`${expression.slice(0, 80)}…: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: await readFile(join(here, 'film-runtime.js'), 'utf8') });
const started = Date.now();
await send('Page.navigate', { url });

const dt = 1000 / fps;
// Let the app start: run frames in (roughly) real time until its hooks are up.
for (let i = 0; ; i++) {
  await sleep(dt);
  const ready = await run(`window.__film ? (__film.step(${dt}), !!(window.__xno?.controls && __xno.starship && __xno.clock && __xno.settings)) : false`).catch(() => false);
  if (ready) break;
  if (i > 60 * 60) throw new Error('the app never got ready (is the dev server running at ' + url + '?)');
}

const ffmpeg = spawn('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out
], { stdio: ['pipe', 'inherit', 'inherit'] });
const write = (buf) => new Promise((r) => (ffmpeg.stdin.write(buf) ? r() : ffmpeg.stdin.once('drain', r)));

let frames = 0;
let captureMs = 0;
for (const shot of shots) {
  await run(`__film.begin({ setup: (${shot.setup ?? '() => {}'}), hold: (${shot.hold ?? '() => {}'}), frame: (${shot.frame}) })`);
  // Warm up: hold the opening pose until the tiles have stopped loading for 2 s (3 s at least, 45 s at most).
  const warm = Date.now();
  while (true) {
    await run(`__film.hold(); __film.step(${dt})`);
    await sleep(25);
    const quiet = inFlight.size === 0 && Date.now() - lastNetwork > 2000;
    if ((quiet && Date.now() - warm > 3000) || Date.now() - warm > 45000) break;
  }
  const warmS = ((Date.now() - warm) / 1000).toFixed(1);
  const n = Math.round(Math.min(shot.seconds, limit) * fps);
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    await run(`__film.frame(${f / fps}); __film.step(${dt})`);
    const c = Date.now();
    const shotPng = await send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    captureMs += Date.now() - c;
    await write(Buffer.from(shotPng.data, 'base64'));
    frames++;
  }
  console.log(`${shot.name}: warmed ${warmS} s, ${n} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
ffmpeg.stdin.end();
await new Promise((r) => ffmpeg.on('close', r));

const seconds = (Date.now() - started) / 1000;
console.log(`\n${out}\n${frames} frames (${(frames / fps).toFixed(1)} s of video) in ${seconds.toFixed(0)} s; capture ${(captureMs / Math.max(1, frames)).toFixed(0)} ms a frame`);
let total = 0;
for (const [host, d] of [...downloaded].sort((a, b) => b[1].bytes - a[1].bytes)) {
  total += d.bytes;
  console.log(`  downloaded from ${host}: ${d.n} files, ${(d.bytes / 1e6).toFixed(1)} MB`);
}
console.log(`  downloaded in all: ${(total / 1e6).toFixed(1)} MB`);
if (errors.length) console.log(`  page errors: ${[...new Set(errors)].slice(0, 5).join(' | ')}`);

if (extras) {
  const base = out.replace(/\.mp4$/, '');
  // README cut: 720p, sized to stay under 10 MB.
  await new Promise((r) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-maxrate', '2400k', '-bufsize', '4800k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}-720p.mp4`], { stdio: 'inherit' }).on('close', r));
  // Poster: a frame from the satellite release.
  const releaseAt = allShots.slice(0, allShots.findIndex((s) => s.name === 'release')).reduce((s, x) => s + x.seconds, 0) + 2.5;
  await new Promise((r) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(releaseAt), '-i', out, '-frames:v', '1', '-q:v', '2', `${base}-poster.jpg`], { stdio: 'inherit' }).on('close', r));
  console.log(`  also ${base}-720p.mp4 and ${base}-poster.jpg`);
}
ws.close();
chrome.kill();
process.exit(0);
