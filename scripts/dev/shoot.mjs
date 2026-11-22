// Headless screenshot of the running dev server, for checking 3D views without
// a visible browser. Uses the local Google Chrome with a throwaway profile.
//   node scripts/dev/shoot.mjs "http://localhost:3000/?fly=45.98,7.66,8,200,-10" out.png [waitSeconds] [jsToEval]
// Waits in real time (Chrome's --screenshot fires before effects run), prints console output.
import { spawn } from 'node:child_process';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, out, waitS = '20', evalJs = ''] = process.argv.slice(2);
// SHOT_SIZE=390x844 for a phone-sized shot (default 1280x800). SHOT_DPR=2 for a high-density screen.
const [width, height] = (process.env.SHOT_SIZE ?? '1280x800').split('x').map(Number);
const dpr = Number(process.env.SHOT_DPR ?? 1);
// SHOT_NET=1 prints what was downloaded, per server.
const net = new Map(); // requestId -> host
const downloaded = new Map(); // host -> { n, bytes }
// SHOT_CACHE=dir keeps the browser profile (and its HTTP cache) there between runs, so map tiles download once.
const profile = process.env.SHOT_CACHE ?? (await mkdtemp(join(tmpdir(), 'xno-chrome-')));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--use-angle=metal', `--window-size=${width},${height}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const logs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  if (m.method === 'Network.responseReceived') net.set(m.params.requestId, new URL(m.params.response.url).host);
  if (m.method === 'Network.loadingFinished' && net.has(m.params.requestId)) {
    const t = downloaded.get(net.get(m.params.requestId)) ?? { n: 0, bytes: 0 };
    downloaded.set(net.get(m.params.requestId), { n: t.n + 1, bytes: t.bytes + m.params.encodedDataLength });
  }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: width < 700 });
// SHOT_CPU=4 slows the page's CPU four times, to see how much headroom a frame has.
if (process.env.SHOT_CPU) await send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.SHOT_CPU) });
if (process.env.SHOT_NET || process.env.SHOT_BLOCK) await send('Network.enable');
// SHOT_BLOCK=host1,host2 makes requests to those hosts fail, to check fallbacks.
if (process.env.SHOT_BLOCK) {
  await send('Network.setBlockedURLs', { urls: process.env.SHOT_BLOCK.split(',').map((h) => `*${h}*`) });
}
await send('Page.navigate', { url });
await sleep(Number(waitS) * 1000);
// SHOT_PROFILE=1 samples the CPU while jsToEval runs and prints where the time went (self time per function).
if (process.env.SHOT_PROFILE) {
  await send('Profiler.enable');
  await send('Profiler.setSamplingInterval', { interval: 500 });
  await send('Profiler.start');
}
if (evalJs) {
  const r = await send('Runtime.evaluate', { expression: evalJs, awaitPromise: true, returnByValue: true });
  logs.push('EVAL ' + JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.text));
}
let profileLines = [];
if (process.env.SHOT_PROFILE) {
  const { profile } = (await send('Profiler.stop')).result;
  const self = new Map(); // node id -> ms
  const dt = profile.timeDeltas ?? [];
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (dt[i] ?? 0) / 1000));
  const byFn = new Map();
  let total = 0;
  for (const n of profile.nodes) {
    const ms = self.get(n.id) ?? 0;
    total += ms;
    const f = n.callFrame;
    const key = `${f.functionName || '(anonymous)'} ${f.url.split('/').pop().split('?')[0].slice(0, 48)}:${f.lineNumber + 1}`;
    byFn.set(key, (byFn.get(key) ?? 0) + ms);
  }
  profileLines = [...byFn].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.SHOT_PROFILE) > 1 ? Number(process.env.SHOT_PROFILE) : 30)
    .map(([k, ms]) => `PROFILE ${ms.toFixed(0).padStart(6)} ms ${(100 * ms / total).toFixed(1).padStart(5)}%  ${k}`);
  profileLines.unshift(`PROFILE total ${total.toFixed(0)} ms sampled`);
}
const shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(out, Buffer.from(shot.result.data, 'base64'));
// SHOT_AGAIN=5 takes a second shot that many seconds later (out-2.png), to see what moved.
if (process.env.SHOT_AGAIN) {
  await sleep(Number(process.env.SHOT_AGAIN) * 1000);
  const again = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(out.replace(/\.png$/, '-2.png'), Buffer.from(again.result.data, 'base64'));
}
const uniq = [...new Set(logs.filter((l) => !/Vercel|DevTools|HMR|THREE.Clock/.test(l)))];
console.log(uniq.slice(-15).map((l) => l.slice(0, l.startsWith('EVAL') ? 6000 : 600)).join('\n'));
if (profileLines.length) console.log(profileLines.join('\n'));
if (process.env.SHOT_NET) {
  for (const [host, t] of [...downloaded].sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`NET ${host}: ${t.n} files, ${(t.bytes / 1024).toFixed(0)} KB`);
  }
}
ws.close();
chrome.kill();
