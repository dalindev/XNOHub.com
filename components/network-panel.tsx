'use client';

import React, { useMemo, useState } from 'react';
import { useNetMode, netMode, type NetMode } from '@/lib/network-mode';
import { VERSION_NAMES, periodMinutes, type StarlinkFile } from '@/lib/orbits';

// Network dashboard: how confirmations are routed, how fast, and what the
// Starlink constellation looks like right now.

const MODES: { id: NetMode; label: string; hint: string }[] = [
  { id: 'race', label: 'Race', hint: 'Cables and Starlink side by side' },
  { id: 'cables', label: 'Cables', hint: 'Submarine and overland fibre' },
  { id: 'starlink', label: 'Starlink', hint: 'Up, across the laser mesh, down' },
  { id: 'classic', label: 'Arcs', hint: 'The original arcs' }
];
const SLOW = [1, 10, 50, 200];

const ms = (v: number) => `${v.toFixed(v < 10 ? 1 : 0)} ms`;

function constellationSummary(data: StarlinkFile) {
  const byVersion = [0, 0, 0, 0];
  const shells = new Map<number, number>();
  const periods: number[] = [];
  for (const r of data.sats) {
    byVersion[r[1]]++;
    const alt = Math.round((r[2] - 6378) / 10) * 10;
    if (alt >= 300) shells.set(alt, (shells.get(alt) ?? 0) + 1);
    periods.push(periodMinutes(r));
  }
  periods.sort((a, b) => a - b);
  const mainShells = [...shells.entries()].filter(([, n]) => n > 150).sort((a, b) => a[0] - b[0]);
  return { byVersion, mainShells, period: periods[periods.length >> 1] };
}

export const NetworkPanel: React.FC<{ starlink: StarlinkFile | null }> = ({ starlink }) => {
  const s = useNetMode();
  const [open, setOpen] = useState(true);
  const summary = useMemo(() => (starlink ? constellationSummary(starlink) : null), [starlink]);
  const st = s.stats;

  return (
    <div className="w-72 rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 text-xs text-gray-300 select-none">
      <button className="w-full flex justify-between px-3 py-2 text-gray-100" onClick={() => setOpen((o) => !o)}>
        <span>Network</span>
        <span className="text-gray-500">{open ? '–' : '+'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                title={m.hint}
                onClick={() => netMode.set({ mode: m.id })}
                className={`rounded px-1 py-1 border ${s.mode === m.id ? 'border-[#209ce9] text-white bg-[#209ce9]/20' : 'border-white/10 hover:border-white/30'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span title="Light crosses an ocean in ~40 ms: too fast to see, so packets are slowed down">Slow motion</span>
            <div className="flex gap-1">
              {SLOW.map((f) => (
                <button
                  key={f}
                  onClick={() => netMode.set({ slowMo: f })}
                  className={`rounded px-1.5 py-0.5 border ${s.slowMo === f ? 'border-[#209ce9] text-white' : 'border-white/10'}`}
                >
                  {f === 1 ? 'real' : `${f}×`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={s.showCables} onChange={(e) => netMode.set({ showCables: e.target.checked })} />
              Cables
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={s.showLasers} onChange={(e) => netMode.set({ showLasers: e.target.checked })} />
              Laser links
            </label>
          </div>

          {s.mode !== 'classic' && (
            <div className="flex flex-col gap-1">
              <div className="text-gray-100">Last confirmation</div>
              {st ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#ffb347]">● Fibre</span>
                    <span>avg {ms(st.fibreAvgMs)} · max {ms(st.fibreMaxMs)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6fe3ff]">● Starlink</span>
                    <span>avg {ms(st.spaceAvgMs)} · max {ms(st.spaceMaxMs)}</span>
                  </div>
                  <div className="text-gray-400">
                    Starlink first to {Math.round(st.spaceWinShare * 100)}% of {st.targets} nodes · overall{' '}
                    {st.races ? Math.round((st.spaceWins / st.races) * 100) : 0}%
                  </div>
                  {st.lastCables.length > 0 && (
                    <div className="text-gray-500 truncate" title={st.lastCables.join(' → ')}>
                      via {st.lastCables.join(' → ')}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-500">Waiting for a confirmation…</div>
              )}
              <div className="text-gray-500">
                One-way propagation only (no switching or queueing). Real nodes sit on fibre; Starlink is a what-if.
              </div>
            </div>
          )}

          {summary && (
            <div className="flex flex-col gap-1">
              <div className="text-gray-100">
                Starlink · {starlink!.sats.length.toLocaleString()} in orbit · ~{summary.period.toFixed(0)} min per orbit
              </div>
              <div className="flex gap-2 flex-wrap">
                {summary.byVersion.map((n, v) =>
                  n ? (
                    <span key={v}>
                      {VERSION_NAMES[v]} {n.toLocaleString()}
                    </span>
                  ) : null
                )}
              </div>
              <div className="text-gray-500">
                Shells: {summary.mainShells.map(([alt, n]) => `${alt} km (${n})`).join(' · ')}
              </div>
              <div className="text-gray-500">Version is estimated from launch date. Laser links are approximate.</div>
            </div>
          )}

          <div className="text-[10px] text-gray-500">
            Orbits:{' '}
            <a className="underline" href="https://celestrak.org" target="_blank" rel="noreferrer">
              CelesTrak
            </a>{' '}
            · Cables:{' '}
            <a className="underline" href="https://www.submarinecablemap.com" target="_blank" rel="noreferrer">
              TeleGeography
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
