/// <reference lib="webworker" />
// Live Nano feed off the main thread: connects to the first working URL,
// reconnects with backoff, rotates to the next URL on failure or silence,
// dedupes by hash and posts only parsed confirmations to the page.
import { parseFeedMessage, createDedupe, backoffMs } from '@/lib/feed/parse';
import type { FeedToPage, PageToFeed } from '@/lib/feed/protocol';

const SILENCE_MS = 120_000; // live traffic is ~0.3/s, two quiet minutes means a dead socket

const post = (msg: FeedToPage) => (self as DedicatedWorkerGlobalScope).postMessage(msg);

let urls: string[] = [];
let urlIndex = 0;
let attempt = 0;
let ws: WebSocket | null = null;
let silenceTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let stopped = false;
const dedupe = createDedupe();

const SUBSCRIBE = JSON.stringify({
  action: 'subscribe',
  topic: 'confirmation',
  options: { confirmation_type: 'active', include_block: 'true' }
});

function armSilence() {
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    post({ type: 'status', state: 'silent', url: urls[urlIndex] });
    ws?.close();
  }, SILENCE_MS);
}

function connect() {
  if (stopped || urls.length === 0) return;
  const url = urls[urlIndex];
  post({ type: 'status', state: 'connecting', url });
  let opened = false;
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleRetry();
    return;
  }
  ws.onopen = () => {
    opened = true;
    attempt = 0;
    ws?.send(SUBSCRIBE);
    armSilence();
    post({ type: 'status', state: 'open', url });
  };
  ws.onmessage = (e) => {
    armSilence();
    const items = parseFeedMessage(e.data).filter((c) => !dedupe.seen(c.message.hash));
    if (items.length) post({ type: 'confirmations', items });
  };
  ws.onclose = () => {
    clearTimeout(silenceTimer);
    ws = null;
    if (stopped) return;
    // A socket that never opened or went silent: try the next URL.
    if (!opened || attempt > 0) urlIndex = (urlIndex + 1) % urls.length;
    scheduleRetry();
  };
  ws.onerror = () => ws?.close();
}

function scheduleRetry() {
  const delay = backoffMs(attempt++);
  post({ type: 'status', state: 'retrying', url: urls[urlIndex], retryInMs: delay });
  clearTimeout(retryTimer);
  retryTimer = setTimeout(connect, delay);
}

self.onmessage = (e: MessageEvent<PageToFeed>) => {
  if (e.data.type === 'start') {
    stopped = false;
    urls = e.data.urls;
    urlIndex = 0;
    attempt = 0;
    connect();
  } else if (e.data.type === 'stop') {
    stopped = true;
    clearTimeout(retryTimer);
    clearTimeout(silenceTimer);
    ws?.close();
  }
};
