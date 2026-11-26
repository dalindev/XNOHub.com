/**
 * The flames' own clock, for their turbulence: seconds of the launch on
 * screen, counted like the mission clock (each frame's time, at most 0.1 s, so
 * a hidden tab adds nothing). The shaders work in float32: raw page time
 * (seconds since the page loaded) makes the noise step instead of flow once a
 * tab has been open for hours; this stays small.
 */
export function makeFlameClock() {
  let last: number | null = null;
  let t = 0;
  return {
    /** Seconds on screen since the launch began, at page time `elapsed` (s). */
    at(elapsed: number) {
      if (last !== null) t += Math.min(Math.max(elapsed - last, 0), 0.1);
      last = elapsed;
      return t;
    },
    /** The launch is over: the next launch starts from 0. */
    reset() {
      last = null;
      t = 0;
    }
  };
}
