import type { NanoConfirmation } from '@/types/index';
import type { FeedStatus, FeedToPage } from '@/lib/feed/protocol';
import { APP_CONFIG } from '@/constants/config';
import { parseNanoAmount } from '@/lib/parse-nano-amount';

// One feed per page, shared by everything that draws it. Subscribers get each
// confirmation exactly once, outside React, so the 3D layers never re-render
// on traffic.

type Listener = (c: NanoConfirmation, amount: number) => void;
type StatusListener = (s: FeedStatus) => void;

const listeners = new Set<Listener>();
const statusListeners = new Set<StatusListener>();
let status: FeedStatus = { state: 'idle' };
let refs = 0;
let stopSource: (() => void) | null = null;

const recent: number[] = []; // arrival times (ms) for the rate readout

function emit(c: NanoConfirmation) {
  const amount = parseNanoAmount(c.message.amount);
  if (!(amount > 0)) return; // change/epoch blocks carry no value
  const now = performance.now();
  recent.push(now);
  while (recent.length && now - recent[0] > 10_000) recent.shift();
  listeners.forEach((l) => l(c, amount));
}

function setStatus(s: FeedStatus) {
  status = s;
  statusListeners.forEach((l) => l(s));
}

function startSample(): () => void {
  setStatus({ state: 'sample' });
  let i = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let cancelled = false;
  import('@/data/sampleConfirmationData').then(({ SampleConfirmationData2 }) => {
    if (cancelled) return;
    timer = setInterval(() => {
      const base = SampleConfirmationData2[i++ % SampleConfirmationData2.length];
      // Sample data repeats; give each copy its own hash so it isn't a "repeat".
      emit({ ...base, message: { ...base.message, hash: `${base.message.hash}-${i}` } });
    }, simulationInterval());
  });
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}

function startWorker(): () => void {
  const worker = new Worker(new URL('../../workers/feed.worker.ts', import.meta.url), {
    type: 'module'
  });
  worker.onmessage = (e: MessageEvent<FeedToPage>) => {
    const msg = e.data;
    if (msg.type === 'confirmations') msg.items.forEach(emit);
    else setStatus({ state: msg.state, url: msg.url });
  };
  worker.postMessage({ type: 'start', urls: [...APP_CONFIG.websocket.urls.nanoList] });
  return () => {
    worker.postMessage({ type: 'stop' });
    worker.terminate();
  };
}

// Simulated traffic: sample confirmations at a steady pace, for when the real network is quiet
// (and for offline work, with NEXT_PUBLIC_USE_SAMPLE_DATA=true). The viewer can switch it on in
// the dashboard; it replaces the live feed while it is on, so the two are never mixed up.
let simulated = APP_CONFIG.debug.useSampleData;
/** One every 3 s unless the environment sets a pace: long enough for each to play through. */
const simulationInterval = () => (process.env.NEXT_PUBLIC_SIMULATION_INTERVAL_MS ? APP_CONFIG.simulation.interval : 3000);
const startSource = () => (simulated ? startSample() : startWorker());

export const isSimulated = () => simulated;

export function setSimulated(on: boolean) {
  if (on === simulated) return;
  simulated = on;
  if (refs > 0) {
    stopSource?.();
    stopSource = startSource();
  }
}

/** Starts the feed on first use; returns a release function. */
export function acquireFeed(): () => void {
  if (refs++ === 0) {
    stopSource = startSource();
  }
  return () => {
    if (--refs === 0) {
      stopSource?.();
      stopSource = null;
      setStatus({ state: 'idle' });
    }
  };
}

export function onConfirmation(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function onFeedStatus(l: StatusListener): () => void {
  statusListeners.add(l);
  l(status);
  return () => statusListeners.delete(l);
}

/** Confirmations per second over the last 10 s. */
export function confirmationsPerSecond(): number {
  const now = performance.now();
  while (recent.length && now - recent[0] > 10_000) recent.shift();
  return recent.length / 10;
}

// Dev-only hooks for checking the arcs and stress-testing:
//   __xno.burst(30, 5)  → 30 sample confirmations a second for 5 s
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const w = window as unknown as { __xno?: Record<string, unknown> };
  w.__xno = {
    ...(w.__xno ?? {}),
    emit,
    async burst(perSecond = 30, seconds = 5) {
      const { SampleConfirmationData2 } = await import('@/data/sampleConfirmationData');
      let n = 0;
      const total = perSecond * seconds;
      return new Promise<number>((resolve) => {
        const id = setInterval(() => {
          const base = SampleConfirmationData2[n % SampleConfirmationData2.length];
          emit({ ...base, message: { ...base.message, hash: `burst-${Date.now()}-${n}` } });
          if (++n >= total) {
            clearInterval(id);
            resolve(n);
          }
        }, 1000 / perSecond);
      });
    }
  };
}
