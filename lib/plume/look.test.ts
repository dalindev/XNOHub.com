import { describe, expect, it } from 'vitest';
import { boosterLook, newPlumeLook, shipLook, type PlumeLook } from '@/lib/plume/look';
import { BOOSTBACK_S, createMissionState, IGNITION_S, LANDING_BURN_S, MECO_S, missionAt } from '@/lib/missions/starship';

const at = (h: number, lit = 33, landing = false) => boosterLook(h, lit, landing, newPlumeLook());

describe('plume look by altitude', () => {
  it('is a narrow column with three diamonds at liftoff', () => {
    const k = at(0);
    expect(k.r0).toBe(4.5);
    expect(k.p).toBe(1);
    expect(k.r0 + k.a * k.length ** k.p).toBeLessThan(8); // about a booster wide, 240 m down
    expect(k.nodes).toBe(3);
    expect(k.cell).toBeCloseTo(27, 5);
    expect(k.core).toBeCloseTo(1.9, 5);
    expect(k.collar).toBeGreaterThan(0);
    expect(k.on).toBe(1);
  });

  it('dims and loses its diamonds by 9 km, its orange edge by 30 km', () => {
    expect(at(9).nodes).toBe(0);
    expect(at(2.5).core).toBeLessThan(at(0.5).core);
    expect(at(30).fringe).toBe(0);
    expect(at(40).fringe).toBe(0);
    // Between keyframes, sizes and brightnesses move on a log scale.
    const mid = at(1.5);
    expect(mid.core).toBeLessThan(at(0.5).core);
    expect(mid.core).toBeGreaterThan(at(2.5).core);
  });

  it('balloons into a wide faint bell lit by the Sun high up', () => {
    const k = at(45);
    const width = (z: number) => 2 * (k.r0 + k.a * z ** k.p);
    expect(width(63)).toBeGreaterThan(150); // about 19 booster widths, 7 widths behind
    expect(width(63)).toBeLessThan(190);
    expect(k.shell).toBeGreaterThan(0);
    expect(k.core).toBeLessThan(1);
  });

  it('shrinks to the engines that burn after MECO and for the landing', () => {
    const meco = at(66, 3);
    expect(meco.r0).toBeCloseTo(1.47, 5);
    expect(meco.nodes).toBe(0);
    expect(at(80, 13).r0).toBeCloseTo(2.95, 5);
    const land = at(0.5, 13, true);
    expect(land.r0).toBeCloseTo(2.95, 5);
    expect(land.nodes).toBe(2);
    expect(at(1.5, 13, true).nodes).toBe(0);
    expect(at(0.3, 3, true).length).toBe(40);
  });

  it('stays a narrow column on the pad while the engines start, never dimmer as more light', () => {
    const k = at(0, 8);
    expect(k.r0 + k.a * 3 ** k.p).toBeLessThan(6); // at the ground, 3 m below the exits
    expect(k.collar).toBeGreaterThan(0);
    expect(k.shell).toBe(0);
    let last = at(0, 0.5);
    for (let lit = 1; lit <= 33; lit += 0.5) {
      const now = at(0, lit);
      expect(now.r0).toBeGreaterThanOrEqual(last.r0 - 1e-9);
      expect(now.on).toBeGreaterThanOrEqual(last.on - 1e-9);
      last = now;
    }
    // Through the real start-up, engine by engine.
    const s = createMissionState();
    for (let t = IGNITION_S; t <= 0; t += 0.01) {
      missionAt(t, s);
      const look = at(s.booster.altKm, s.booster.flame * 33);
      expect(look.r0 + look.a * 3 ** look.p).toBeLessThan(6);
    }
  });

  it('grows and shrinks smoothly as engines relight for the boost-back and the landing', () => {
    const s = createMissionState();
    for (const [from, to] of [
      [BOOSTBACK_S[0] - 1, BOOSTBACK_S[0] + 2],
      [LANDING_BURN_S - 1, LANDING_BURN_S + 9]
    ]) {
      let prev: PlumeLook | null = null;
      for (let i = 0; from + i / 60 <= to; i++) {
        const t = from + i / 60;
        missionAt(t, s);
        // As the component passes it: the centre 3 alone from MECO to the boost-back.
        const lit = s.booster.flame * 33;
        const plumeLit = t >= MECO_S && t < BOOSTBACK_S[0] ? Math.min(lit, 3) : lit;
        const k = boosterLook(s.booster.altKm, plumeLit, t > LANDING_BURN_S - 1, newPlumeLook());
        if (prev && prev.on > 0.001 && k.on > 0.001) {
          for (const f of ['r0', 'a', 'length', 'shell'] as const) if (prev[f] || k[f]) expect(Math.abs(k[f] / prev[f] - 1)).toBeLessThan(0.15);
          if (prev.nodes > 0 && k.nodes > 0) expect(Math.abs(k.cell / prev.cell - 1)).toBeLessThan(0.15);
        }
        prev = k;
      }
    }
  });

  it('brightens the landing flame’s orange edge smoothly as it nears the ground', () => {
    expect(at(0.0999, 3, true).fringe / at(0.1001, 3, true).fringe).toBeLessThan(1.1);
    expect(at(0, 3, true).fringe).toBeCloseTo(0.1, 5);
    expect(at(1, 3, true).fringe).toBeCloseTo(0.03, 5);
  });

  it('shows nothing of the ship’s plume but a faint sunlit haze', () => {
    const k = shipLook(150, 6, newPlumeLook());
    expect(k.on).toBe(1);
    expect(k.core).toBe(0);
    expect(k.body).toBe(0);
    expect(k.shell).toBeLessThan(0.01);
  });
});
