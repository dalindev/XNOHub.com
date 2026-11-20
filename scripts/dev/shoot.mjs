// Headless screenshot of the running dev server, for checking 3D views without
// a visible browser. Uses the local Google Chrome with a throwaway profile.
//   node scripts/dev/shoot.mjs "http://localhost:3000/?fly=45.98,7.66,8,200,-10" out.png [waitSeconds] [jsToEval]
// Waits in real time (Chrome's --screenshot fires before effects run), prints console output.import { spawn } from 'node:child_process';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, out, waitS = '20', evalJs = ''] = process.argv.slice(2);
const profile = await mkdtemp(join(tmpdir(), 'xno-chrome-'));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--use-angle=metal', '--window-size=1280,800', 'about:blank'
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
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(Number(waitS) * 1000);
if (evalJs) {
  const r = await send('Runtime.evaluate', { expression: evalJs, awaitPromise: true, returnByValue: true });
  logs.push('EVAL ' + JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.text));
}
const shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(out, Buffer.from(shot.result.data, 'base64'));
const uniq = [...new Set(logs.filter((l) => !/Vercel|DevTools|HMR|THREE.Clock/.test(l)))];
console.log(uniq.slice(-15).map((l) => l.slice(0, 600)).join('\n'));
ws.close();
chrome.kill();
