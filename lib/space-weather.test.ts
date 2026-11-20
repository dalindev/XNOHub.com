import { describe, expect, it } from 'vitest';
import { auroraDrive, parseBz, parseKp, parseWindSpeed } from './space-weather';

describe('NOAA solar wind summaries', () => {
  it('reads the speed from the current list form and the older object form', () => {
    expect(parseWindSpeed([{ proton_speed: 394, time_tag: '2026-11-20T06:09:00Z' }])).toBe(394);
    expect(parseWindSpeed({ WindSpeed: '512', TimeStamp: '2024-05-10 17:00:00.000' })).toBe(512);
  });

  it('reads which way the magnetic field points', () => {
    expect(parseBz([{ bt: 5, bz_gsm: -1, time_tag: '2026-11-20T06:09:00Z' }])).toBe(-1);
    expect(parseBz({ Bt: '18', Bz: '-14', TimeStamp: '2024-05-10 17:00:00.000' })).toBe(-14);
  });

  it('gives null for gaps and instrument errors instead of a number', () => {
    expect(parseWindSpeed([{ proton_speed: null, time_tag: 'x' }])).toBeNull();
    expect(parseWindSpeed([{ proton_speed: -9999 }])).toBeNull();
    expect(parseWindSpeed([])).toBeNull();
    expect(parseWindSpeed('<html>')).toBeNull();
    expect(parseBz([{ bz_gsm: -99999 }])).toBeNull();
    expect(parseBz(null)).toBeNull();
  });

  it('still reads the K index in both forms NOAA has published', () => {
    expect(parseKp([{ time_tag: 'x', Kp: 2.33 }])).toBe(2.33);
    expect(parseKp([['time_tag', 'Kp'], ['x', '4.67']])).toBe(4.67);
  });
});

describe('aurora animation from space weather', () => {
  it('moves at the usual pace in a typical solar wind, faster in a fast stream, within limits', () => {
    expect(auroraDrive({ kp: 2, windKms: 450, bz: 0 }).pace).toBe(1);
    expect(auroraDrive({ kp: 2, windKms: 700, bz: 0 }).pace).toBeCloseTo(1.56, 2);
    expect(auroraDrive({ kp: 2, windKms: 250, bz: 0 }).pace).toBe(0.6);
    expect(auroraDrive({ kp: 9, windKms: 1500, bz: -40 }).pace).toBe(2);
  });

  it('is calm on a quiet day and saturates in a storm', () => {
    const quiet = auroraDrive({ kp: 2, windKms: 394, bz: -1 }).activity;
    const active = auroraDrive({ kp: 4.3, windKms: 520, bz: -6 }).activity;
    const storm = auroraDrive({ kp: 8, windKms: 800, bz: -20 }).activity;
    expect(quiet).toBeGreaterThan(0.15);
    expect(quiet).toBeLessThan(0.3);
    expect(active).toBeGreaterThan(quiet + 0.25);
    expect(storm).toBe(1);
  });

  it('a southward field stirs it up, a northward one does not', () => {
    const south = auroraDrive({ kp: 2, windKms: 450, bz: -10 }).activity;
    const north = auroraDrive({ kp: 2, windKms: 450, bz: 10 }).activity;
    const none = auroraDrive({ kp: 2, windKms: 450, bz: 0 }).activity;
    expect(south - none).toBeCloseTo(0.25, 5);
    expect(north).toBe(none);
  });

  it('treats missing readings as an ordinary quiet day', () => {
    const d = auroraDrive({ kp: null, windKms: null, bz: null });
    expect(d.pace).toBe(1);
    expect(d.activity).toBeCloseTo(auroraDrive({ kp: 2, windKms: 450, bz: 0 }).activity, 10);
  });
});
