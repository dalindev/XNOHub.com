// Headless frames of the running dev server, many per page load: one Chrome,
// one page, then each step's js runs in the page and some steps are shot.
// Used to check the Starship flames against photos (docs/flames.md, "How to check").
//   node scripts/dev/probe.mjs <spec.mjs> <outDir>
// A spec default-exports { url?, settle?, steps: [{ name?, js, wait?, shot?, hideUi? }] }.
// Each step's js is awaited in the page; what it returns is printed.
// SHOT_SIZE=1280x720 (default), SHOT_DPR=1, PROBE_URL=http://localhost:3000.
// The browser profile (with its HTTP cache) stays in SHOT_CACHE, by default
// video/out/shot-cache, so map tiles download once.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [specPath, outDir] = process.argv.slice(2);
if (!specPath || !outDir) {
  console.error('usage: node scripts/dev/probe.mjs <spec.mjs> <outDir>');
  process.exit(1);
}
const spec = (await import(pathToFileURL(resolve(specPath)).href)).default;
const [width, height] = (process.env.SHOT_SIZE ?? '1280x720').split('x').map(Number);
const dpr = Number(process.env.SHOT_DPR ?? 1);
const base = process.env.PROBE_URL ?? 'http://localhost:3000';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const profile = process.env.SHOT_CACHE ?? join(repo, 'video/out/shot-cache');
await mkdir(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9600 + Math.floor(Math.random() * 100);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--use-angle=metal', `--window-size=${width},${height}`, 'about:blank'
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
  } catch {}
}
if (!target) {
  console.error('Chrome did not start (is another probe still running on the same profile?)');
  process.exit(1);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const errors = [];
const logs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m), pending.delete(m.id);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled') {
    const text = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 400);
    if (m.params.type === 'error') errors.push(text);
    else if (m.params.type === 'warning' || text.startsWith('[probe]')) logs.push(text);
  }
};
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const run = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return 'THREW: ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
await send('Page.navigate', { url: `${base}${spec.url ?? '/'}` });
await sleep(spec.settle ?? 10000);

// Shots show the canvas only: the page's panels and buttons are hidden for the capture.
const HIDE = `(() => { if (document.getElementById('probe-hide')) return; const s = document.createElement('style'); s.id = 'probe-hide';
  s.textContent = 'body * { visibility: hidden !important; } canvas, canvas * { visibility: visible !important; }';
  document.head.appendChild(s); })()`;
const SHOW = `document.getElementById('probe-hide')?.remove()`;
for (const [k, step] of spec.steps.entries()) {
  await run(SHOW);
  const value = await run(`(async () => { ${step.js}; })()`);
  if (step.wait) await sleep(step.wait);
  const name = step.name ?? `step-${k}`;
  if (value !== undefined) console.log(name, typeof value === 'string' ? value : JSON.stringify(value));
  if (step.shot) {
    if (step.hideUi !== false) {
      await run(HIDE);
      await sleep(250);
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(outDir, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
    console.log('shot', name);
  }
}
if (logs.length) console.log('PAGE LOGS:\n' + [...new Set(logs)].slice(0, 20).join('\n'));
if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 12).join('\n'));
ws.close();
chrome.kill();
process.exit(0);
