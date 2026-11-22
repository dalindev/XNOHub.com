'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useConfirmations } from '@/providers/confirmation-provider';
import { onConfirmation, confirmationsPerSecond } from '@/lib/feed/bus';
import { parseNanoAmount } from '@/lib/parse-nano-amount';
import { getStyleByNanoAmount } from '@/lib/get-style-by-nano-amount';
import { getRepName, useReps, formatWeight } from '@/lib/reps';
import { settings, useSettings, type SignalMode } from '@/lib/settings';
import { useRouteStats, type LegStats } from '@/lib/route-stats';
import { VOTE_WORK_MS, FINAL_VOTE_WORK_MS } from '@/lib/confirm-time';
import { useSpaceWeather, kpLabel } from '@/lib/space-weather';
import { useCloudSource } from '@/lib/live-clouds';
import { VERSION_NAMES, periodMinutes, type StarlinkFile } from '@/lib/orbits';
import { DonationImagePopover } from '@/components/donation-image-popover';
import { APP_CONFIG } from '@/constants/config';

// One panel for everything live: the feed, how the signal travels, the sky
// and weather layers, and the Starlink constellation. All of it comes from
// the feed and public data files in the browser; there is no database.

const FIBRE = '#ffb347';
const SPACE = '#6fe3ff';
const VOTE = '#ffe3b0';
const CONFIRMED = '#6dffa8';
const CLOUDS = [
  { value: 0, label: 'off' },
  { value: 0.5, label: 'light' },
  { value: 1, label: 'full' }
];

const MODES: { id: SignalMode; label: string; hint: string }[] = [
  { id: 'cables', label: 'Cables', hint: 'How it really travels: undersea and land fibre' },
  { id: 'starlink', label: 'Starlink', hint: 'What if it went by satellite: up, across the laser links, down' },
  { id: 'race', label: 'Both', hint: 'Fibre and Starlink side by side' },
  { id: 'classic', label: 'Arcs', hint: 'Simple arcs between nodes' }
];
const SLOW = [1, 10, 50, 200];

function formatAmount(v: number) {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return v.toLocaleString('en-US', { maximumSignificantDigits: 3 });
}

function age(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s >= 86_400) return ''; // replayed sample data carries its original timestamps
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
}

/** "2026-11-19" → "19 Nov". */
const shortDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const ms = (v: number) => `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`;

/** "104 ms" for a leg whose votes add up to a quorum, else null. */
const quorum = (leg: LegStats | null) => (leg && leg.quorumMs !== null ? ms(leg.quorumMs) : null);

/** Confirmations per second for the last minute, plus a running total. */
function useFeedRate() {
  const [snap, setSnap] = useState({ perSecond: new Array<number>(60).fill(0), total: 0, rate: 0 });
  useEffect(() => {
    const buckets = new Array<number>(60).fill(0);
    let current = 0, total = 0;
    const off = onConfirmation(() => {
      current++;
      total++;
    });
    const id = setInterval(() => {
      buckets.push(current);
      buckets.shift();
      current = 0;
      setSnap({ perSecond: [...buckets], total, rate: confirmationsPerSecond() });
    }, 1000);
    return () => {
      off();
      clearInterval(id);
    };
  }, []);
  return snap;
}

const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const W = 84, H = 26;
  // 5-second moving average: single confirmations would otherwise read as spikes.
  const smooth = values.map((_, i) => {
    const part = values.slice(Math.max(0, i - 4), i + 1);
    return part.reduce((a, b) => a + b, 0) / part.length;
  });
  const max = Math.max(1, ...smooth);
  const pts = smooth.map((v, i) => [(i / (smooth.length - 1)) * W, H - 2 - (v / max) * (H - 5)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#209ce9" stopOpacity="0.45" />
          <stop offset="1" stopColor="#209ce9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#spark)" />
      <path d={line} fill="none" stroke="#4db8ff" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill="#bfe6ff" />
    </svg>
  );
};

const Section: React.FC<{ title: string; note?: React.ReactNode; children: React.ReactNode }> = ({ title, note, children }) => (
  <section className="border-t border-white/10 px-4 py-3">
    <div className="mb-2 flex items-baseline justify-between">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500">{title}</h3>
      {note && <span className="text-[10px] text-gray-500">{note}</span>}
    </div>
    {children}
  </section>
);

const Pill: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode; title?: string }> = ({ on, onClick, children, title }) => (
  <button
    onClick={onClick}
    title={title}
    aria-pressed={on}
    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
      on ? 'border-[#209ce9]/60 bg-[#209ce9]/15 text-gray-100' : 'border-white/10 text-gray-500 hover:text-gray-300'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-[#4db8ff]' : 'bg-gray-600'}`} />
    {children}
  </button>
);

const TimingRow: React.FC<{ label: string; color: string; leg: LegStats; scale: number }> = ({ label, color, leg, scale }) => (
  <div>
    <div className="flex items-baseline justify-between">
      <span style={{ color }}>{label}</span>
      <span className="tabular-nums text-gray-300">
        {ms(leg.avgMs)} <span className="text-gray-500">avg ·</span> {ms(leg.maxMs)} <span className="text-gray-500">farthest</span>
      </span>
    </div>
    <div className="relative mt-1 h-1 rounded-full bg-white/5">
      <div className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${(leg.maxMs / scale) * 100}%`, background: color }} />
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(leg.avgMs / scale) * 100}%`, background: color }} />
    </div>
  </div>
);

function starlinkSummary(data: StarlinkFile) {
  const byVersion = [0, 0, 0, 0];
  const periods: number[] = [];
  for (const r of data.sats) {
    byVersion[r[1]]++;
    periods.push(periodMinutes(r));
  }
  periods.sort((a, b) => a - b);
  return { byVersion, period: periods[periods.length >> 1] };
}

const VERSION_SHADES = ['#5b7fa6', '#6fb1e8', '#bfe6ff', '#ffffff'];

export const Dashboard: React.FC<{ starlink: StarlinkFile | null }> = ({ starlink }) => {
  const s = useSettings();
  const stats = useRouteStats();
  const weather = useSpaceWeather();
  const cloudSource = useCloudSource();
  const { confirmationHistory } = useConfirmations();
  const feed = useFeedRate();
  const reps = useReps();
  const [open, setOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 768));
  const sl = useMemo(() => (starlink ? starlinkSummary(starlink) : null), [starlink]);

  const nodes = useMemo(() => {
    const list = reps?.reps ?? [];
    const online = list.filter((r) => r.online).length;
    return { live: Math.max(reps?.liveNodes ?? 0, online), online, weight: reps?.onlineWeight ?? 0 };
  }, [reps]);

  const routed = s.mode !== 'classic';
  const scale = Math.max(stats?.fibre?.maxMs ?? 0, stats?.space?.maxMs ?? 0, 1);
  // When the first round of votes reached a quorum at the sender: fibre's, unless only Starlink is drawn.
  const votes = (s.mode === 'starlink' ? stats?.space : (stats?.fibre ?? stats?.space))?.votesMs ?? null;

  return (
    <div className="pointer-events-none flex max-h-full w-full flex-col items-end gap-2 text-xs text-gray-300 select-none md:w-[19.5rem]">
      <div className="pointer-events-auto flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/70 shadow-2xl shadow-black/40 backdrop-blur-md">
        {/* Live feed */}
        <button className="w-full px-4 pb-2.5 pt-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
              <span className="text-2xl font-light leading-none tabular-nums text-white">{feed.rate.toFixed(1)}</span>
              <span className="whitespace-nowrap text-gray-400">confirmations / s</span>
            </div>
            <Sparkline values={feed.perSecond} />
            {open ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />}
          </div>
          <div className="mt-1.5 truncate text-[11px] text-gray-500">
            {feed.total.toLocaleString('en-US')} this visit · {nodes.live} live nodes, {nodes.online} voting
          </div>
        </button>

        {open && (
          <div className="min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]">
            <Section title="Latest" note={nodes.weight ? `${formatWeight(nodes.weight)} voting` : undefined}>
              {confirmationHistory.length === 0 ? (
                <div className="text-gray-500">Waiting for the first confirmation…</div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {confirmationHistory.slice(0, 7).map((c, i) => {
                    const amount = parseNanoAmount(c.message.amount);
                    const send = c.message.block.subtype === 'send';
                    const tip = c.message.block.link_as_account === APP_CONFIG.donations.nano;
                    const rep = getRepName(c.message.block.representative);
                    return (
                      <li
                        key={c.message.hash}
                        className={`flex items-center gap-2 tabular-nums ${i === 0 ? 'text-white' : ''}`}
                        title={`${send ? 'Send' : 'Receive'} · ${c.message.account}`}
                      >
                        {send ? (
                          <ArrowUpRight className="h-3 w-3 shrink-0 text-rose-400/80" />
                        ) : (
                          <ArrowDownLeft className="h-3 w-3 shrink-0 text-emerald-400/80" />
                        )}
                        <span className="shrink-0" style={{ color: getStyleByNanoAmount(amount).hexColor }}>
                          Ӿ {formatAmount(amount)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-right text-gray-500">{tip ? 'tip, thank you' : (rep ?? '')}</span>
                        <span className="w-7 shrink-0 text-right text-gray-600">{age(parseInt(c.time))}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title="Signal path" note={routed ? (s.slowMo === 1 ? 'real time' : `slowed ${s.slowMo}×`) : undefined}>
              <div className="grid grid-cols-4 gap-1 rounded-lg bg-white/5 p-0.5">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    title={m.hint}
                    onClick={() => settings.set({ mode: m.id })}
                    className={`rounded-md py-1 transition-colors ${
                      s.mode === m.id ? 'bg-[#209ce9]/25 text-white shadow-inner' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {routed && (
                <>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                    {s.mode !== 'starlink' && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded-full" style={{ background: FIBRE, boxShadow: `0 0 6px ${FIBRE}` }} />
                        fibre cable
                      </span>
                    )}
                    {s.mode !== 'cables' && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded-full" style={{ background: SPACE, boxShadow: `0 0 6px ${SPACE}` }} />
                        Starlink laser
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="h-px w-4 rounded-full" style={{ background: s.mode === 'starlink' ? '#cdf5ff' : VOTE }} />
                      vote
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-px w-4 rounded-full" style={{ background: '#a8ffcf' }} />
                      final vote
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: CONFIRMED, boxShadow: `0 0 6px ${CONFIRMED}` }} />
                      confirmed
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-col gap-2">
                    {stats?.fibre && s.mode !== 'starlink' && <TimingRow label="Fibre" color={FIBRE} leg={stats.fibre} scale={scale} />}
                    {stats?.space && s.mode !== 'cables' && <TimingRow label="Starlink" color={SPACE} leg={stats.space} scale={scale} />}
                    {!stats && <div className="text-gray-500">Waiting for a confirmation to route…</div>}
                  </div>

                  {stats && (
                    <div className="mt-2 text-[11px] leading-snug text-gray-500">
                      <div className="text-gray-400">
                        {stats.drawn >= stats.online
                          ? `Sent to all ${stats.online} other online nodes; each votes, then votes again to finalise.`
                          : `Busy network: drawing ${stats.drawn} of ${stats.online} nodes.`}
                      </div>
                      {(quorum(stats.fibre) || quorum(stats.space)) && (
                        <div className="text-gray-400" title="A node counts a block as confirmed once it has seen final votes carrying 67% of the online voting weight. Every node does this for itself">
                          <span style={{ color: CONFIRMED }}>Confirmed</span> at the sender (two-thirds of the final votes in):{' '}
                          {[s.mode !== 'starlink' && quorum(stats.fibre) && `${quorum(stats.fibre)}${s.mode === 'race' ? ' by fibre' : ''}`,
                            s.mode !== 'cables' && quorum(stats.space) && `${quorum(stats.space)}${s.mode === 'race' ? ' by Starlink' : ''}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                      {s.mode === 'race' && stats.pairs > 0 && (
                        <div className="text-gray-400">
                          Starlink got there first for {stats.spaceFirst} of {stats.pairs} nodes
                          {stats.totalPairs > stats.pairs && ` (${Math.round((stats.totalSpaceFirst / stats.totalPairs) * 100)}% overall)`}
                        </div>
                      )}
                      {s.mode !== 'starlink' && stats.cables.length > 0 && (
                        <div className="truncate" title={stats.cables.join(' → ')}>
                          via {stats.cables.join(' → ')}
                        </div>
                      )}
                      {s.mode === 'starlink' && stats.hops > 0 && <div>longest route relayed by {stats.hops} satellites</div>}
                      <div>
                        {votes !== null && `Two rounds: the sender has two-thirds of the first votes at ${ms(votes)}, then of the final votes. `}
                        Travel is at light speed on real routes. Each node&rsquo;s own time to check and vote is an estimate (about {VOTE_WORK_MS} ms, then{' '}
                        {FINAL_VOTE_WORK_MS} ms for the final vote), set to match Nano&rsquo;s usual 0.3 s.
                        {s.mode !== 'cables' && ' Starlink is a what-if: real nodes are on fibre.'}
                      </div>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-gray-400" title="Light crosses an ocean in about 40 ms and a block confirms in about 0.3 s. Slow it down to follow one">
                      Slow motion
                    </span>
                    <div className="flex gap-0.5 rounded-lg bg-white/5 p-0.5">
                      {SLOW.map((f) => (
                        <button
                          key={f}
                          onClick={() => settings.set({ slowMo: f })}
                          className={`rounded-md px-2 py-0.5 tabular-nums transition-colors ${
                            s.slowMo === f ? 'bg-[#209ce9]/25 text-white' : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {f === 1 ? 'real' : `${f}×`}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Section>

            <Section title="Earth and sky">
              <div
                className="mb-2 flex items-center justify-between"
                title="Real clouds from NASA's daily satellite photo of the whole Earth (the newest complete day). Where it was too dark for the satellite, such as the far north in winter, typical clouds are shown instead"
              >
                <span className="text-gray-400">
                  Clouds{' '}
                  <span className="text-gray-500">
                    {cloudSource.state === 'live' && cloudSource.day ? `of ${shortDay(cloudSource.day)}` : cloudSource.state === 'archive' ? 'archive picture' : '…'}
                  </span>
                </span>
                <div className="flex gap-0.5 rounded-lg bg-white/5 p-0.5">
                  {CLOUDS.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => settings.set({ clouds: c.value })}
                      className={`rounded-md px-2 py-0.5 transition-colors ${
                        s.clouds === c.value ? 'bg-[#209ce9]/25 text-white' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill
                  on={s.aurora}
                  onClick={() => settings.set({ aurora: !s.aurora })}
                  title="NOAA aurora forecast for the next hour. Kp measures how disturbed Earth's magnetic field is, 0 to 9. The aurora moves faster the faster the solar wind, and shows more red and pink the more disturbed the field"
                >
                  Aurora
                  <span className="text-gray-500">
                    {weather.kp !== null ? `Kp ${weather.kp.toFixed(1)} ${kpLabel(weather.kp)}` : weather.state === 'error' ? 'no data' : '…'}
                  </span>
                </Pill>
                <Pill on={s.cables} onClick={() => settings.set({ cables: !s.cables })} title="Every submarine cable">
                  Cables
                </Pill>
                <Pill on={s.lasers} onClick={() => settings.set({ lasers: !s.lasers })} title="Laser links between Starlink satellites (approximate)">
                  Laser links
                </Pill>
                <Pill on={s.skyLabels} onClick={() => settings.set({ skyLabels: !s.skyLabels })} title="Names of the planets and brightest stars">
                  Sky labels
                </Pill>
              </div>
              {weather.aurora && s.aurora && (
                <div className="mt-2 text-[11px] text-gray-500">
                  Aurora chance now: up to {weather.peakNorth}% in the north, {weather.peakSouth}% in the south
                  {weather.windKms !== null && (
                    <>
                      . Solar wind: {Math.round(weather.windKms)} km/s
                      {weather.bz !== null && Math.abs(weather.bz) >= 1 && `, field ${Math.abs(Math.round(weather.bz))} nT ${weather.bz < 0 ? 'south (feeds the aurora)' : 'north'}`}
                    </>
                  )}
                </div>
              )}
            </Section>

            {sl && starlink && (
              <Section title="Starlink" note={`one orbit every ${sl.period.toFixed(0)} min`}>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-light tabular-nums text-white">{starlink.sats.length.toLocaleString('en-US')}</span>
                  <span className="text-gray-400">satellites in orbit right now</span>
                </div>
                <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-white/5">
                  {sl.byVersion.map((n, v) =>
                    n ? <div key={v} style={{ width: `${(n / starlink.sats.length) * 100}%`, background: VERSION_SHADES[v] }} /> : null
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-gray-400">
                  {sl.byVersion.map((n, v) =>
                    n ? (
                      <span key={v} className="flex items-center gap-1 tabular-nums">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: VERSION_SHADES[v] }} />
                        {VERSION_NAMES[v]} {n.toLocaleString('en-US')}
                      </span>
                    ) : null
                  )}
                </div>
                <div className="mt-1 text-[11px] text-gray-600">Version estimated from launch date</div>
              </Section>
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-auto">
        <DonationImagePopover />
      </div>
    </div>
  );
};
