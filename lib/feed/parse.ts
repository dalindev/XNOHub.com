import type { NanoConfirmation } from '@/types/index';

// Pure helpers shared by the feed worker and tests. No DOM, no React.

const isConfirmation = (v: unknown): v is NanoConfirmation => {
  const m = (v as NanoConfirmation | null)?.message;
  return (
    !!m &&
    typeof m.hash === 'string' &&
    typeof m.amount === 'string' &&
    !!m.block &&
    typeof m.block.representative === 'string'
  );
};

/**
 * Turns one raw websocket payload into zero or more confirmations.
 * Handles a node's own websocket (`{topic:'confirmation', message}`) and the
 * somenano repeater, which batches (`{topic, blocks: [...]}`) where each item
 * is either a full confirmation or just its `message`.
 */
export function parseFeedMessage(raw: unknown): NanoConfirmation[] {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;

  if (obj.topic === 'confirmation' && isConfirmation(obj)) return [obj];

  if (Array.isArray(obj.blocks)) {
    const out: NanoConfirmation[] = [];
    for (const item of obj.blocks) {
      if (isConfirmation(item)) out.push(item);
      else if (isConfirmation({ message: item })) {
        out.push({
          topic: 'confirmation',
          time: String(obj.dtg ?? Date.now()),
          message: item as NanoConfirmation['message']
        });
      }
    }
    return out;
  }
  return [];
}

/** Remembers the last `capacity` hashes; `seen` returns true for repeats. */
export function createDedupe(capacity = 2048) {
  const ring: (string | undefined)[] = new Array(capacity);
  const set = new Set<string>();
  let i = 0;
  return {
    seen(hash: string): boolean {
      if (set.has(hash)) return true;
      const old = ring[i];
      if (old !== undefined) set.delete(old);
      ring[i] = hash;
      set.add(hash);
      i = (i + 1) % capacity;
      return false;
    },
    get size() {
      return set.size;
    }
  };
}

/** Reconnect delay: 1s, 2s, 4s … capped at 30s, with ±20% jitter. */
export function backoffMs(attempt: number, rand = Math.random): number {
  const base = Math.min(30_000, 1000 * 2 ** Math.max(0, attempt));
  return Math.round(base * (0.8 + rand() * 0.4));
}
