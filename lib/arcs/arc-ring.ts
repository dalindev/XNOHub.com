// Fixed-capacity slot allocator for GPU arc instances. Slots are reused
// oldest-first, so no arc ever needs to be removed: an old arc simply gets
// overwritten after it has finished animating. Tracks which slots changed so
// only that range is re-uploaded.

export class ArcRing {
  readonly capacity: number;
  private next = 0;
  private dirtyFrom = -1;
  private dirtyTo = -1; // inclusive
  private wrapped = false;
  /** Total slots ever written; instance count = min(written, capacity). */
  written = 0;

  constructor(capacity: number) {
    if (capacity < 1) throw new Error('capacity must be >= 1');
    this.capacity = capacity;
  }

  /** Returns the slot to write the next arc into. */
  claim(): number {
    const slot = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.written++;
    if (this.dirtyFrom === -1) {
      this.dirtyFrom = this.dirtyTo = slot;
    } else if (slot === this.dirtyTo + 1) {
      this.dirtyTo = slot;
    } else {
      this.wrapped = true; // wrapped past the end this frame: upload everything
    }
    return slot;
  }

  get count(): number {
    return Math.min(this.written, this.capacity);
  }

  /** Dirty range since the last call as [offset, count], or null if clean. */
  takeDirty(): [number, number] | null {
    if (this.dirtyFrom === -1) return null;
    const range: [number, number] = this.wrapped
      ? [0, this.capacity]
      : [this.dirtyFrom, this.dirtyTo - this.dirtyFrom + 1];
    this.dirtyFrom = this.dirtyTo = -1;
    this.wrapped = false;
    return range;
  }
}

/**
 * How many of the other nodes one confirmation fans out to. Everything while
 * traffic is light (today ~0.3/s), shrinking to 1% at 20 confirmations/s so a
 * spam wave can't flood the GPU.
 */
export function fanOutFraction(confirmationsPerSecond: number): number {
  if (confirmationsPerSecond < 2.5) return 1;
  if (confirmationsPerSecond >= 20) return 0.01;
  const f = (confirmationsPerSecond - 2.5) / (20 - 2.5);
  return 0.2 - f * 0.19;
}
