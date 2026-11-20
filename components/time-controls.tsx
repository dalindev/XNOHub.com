'use client';

import React, { useEffect, useState } from 'react';
import { resetClock, setWarp, simNowMs, useClockState } from '@/lib/sim-clock';

// Time warp for the Sun and Moon. The Nano feed is never warped.

const STEPS = [
  { warp: 1, label: '1×' },
  { warp: 60, label: '1 min/s' },
  { warp: 3600, label: '1 h/s' },
  { warp: 86_400, label: '1 d/s' }
];

export const TimeControls: React.FC = () => {
  const { warp, live } = useClockState();
  const [now, setNow] = useState(() => simNowMs());

  useEffect(() => {
    const id = setInterval(() => setNow(simNowMs()), warp > 1 ? 100 : 1000);
    return () => clearInterval(id);
  }, [warp]);

  const stamp = new Date(now).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  return (
    <div className="flex flex-col gap-1 text-xs text-gray-300 select-none">
      <div className="font-mono">
        {stamp}
        {live ? <span className="ml-2 text-green-400">now</span> : null}
      </div>
      <div className="flex gap-1">
        {STEPS.map((s) => (
          <button
            key={s.warp}
            onClick={() => setWarp(s.warp)}
            className={`px-2 py-0.5 rounded border ${
              warp === s.warp
                ? 'border-[#209ce9] text-[#209ce9]'
                : 'border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
        {!live && (
          <button
            onClick={resetClock}
            className="px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:text-gray-200"
          >
            Now
          </button>
        )}
      </div>
    </div>
  );
};
