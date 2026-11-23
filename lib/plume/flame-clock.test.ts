import { describe, expect, it } from 'vitest';
import { makeFlameClock } from './flame-clock';

// The plume shader's noise coordinate along the flow, in float32 as on the GPU
// (sea level: the gas flows at 100 m/s, eddies 7 m).
const qy = (z: number, time: number) => Math.fround(Math.fround(z - Math.fround(Math.fround(time) * 100)) / 7);

/** Frames at 60 fps from page time `from` (s) for `seconds`; the clock's last reading. */
const run = (clock: ReturnType<typeof makeFlameClock>, from: number, seconds: number) => {
  let t = 0;
  for (let i = 0; i <= Math.round(seconds * 60); i++) t = clock.at(from + i / 60);
  return t;
};

describe('the flames’ clock', () => {
  it('counts from the launch, so the noise still flows on a page open for a day', () => {
    const clock = makeFlameClock();
    const t = run(clock, 86_400, 10.5);
    expect(t).toBeCloseTo(10.5, 6);
    // Two points 25 cm apart along the plume still get different noise...
    expect(qy(0.25, t)).not.toBe(qy(0, t));
    // ...which a day's worth of page time would merge.
    expect(qy(0.25, 86_410.5)).toBe(qy(0, 86_410.5));
  });

  it('does not count the time a tab is hidden mid-launch', () => {
    const clock = makeFlameClock();
    run(clock, 5000, 10);
    const t = clock.at(5010 + 86_400); // back a day later
    expect(t).toBeLessThan(10.2);
    expect(qy(0.25, t)).not.toBe(qy(0, t));
  });

  it('starts again at the next launch', () => {
    const clock = makeFlameClock();
    run(clock, 100, 5);
    clock.reset();
    expect(clock.at(5000)).toBe(0);
    expect(run(clock, 5000, 2)).toBeCloseTo(2, 6);
  });
});
