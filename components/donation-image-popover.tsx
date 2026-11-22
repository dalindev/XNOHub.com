'use client';

import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

const ADDRESS = 'nano_1osom16ctb773i6zi5fnepfro7bcmr5yqxb4qnmtzxkmdg88o4x6obmchzna';

export const DonationImagePopover = () => {
  const [copied, setCopied] = useState(false);
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* The same glass card as the dashboard above it. */}
        <button className="flex w-full select-none items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 text-left text-xs text-gray-300 shadow-2xl shadow-black/40 backdrop-blur-md transition-colors hover:border-[#209ce9]/60 hover:text-white">
          <span>
            <span className="mr-1.5">☄️</span>Summon a meteor with a tip
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#4db8ff]">Ӿ tip</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="mb-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-black/85 p-0 text-gray-300 shadow-2xl backdrop-blur-md"
      >
        <div className="px-4 pb-1 pt-3.5">
          <div className="text-sm font-medium text-white">Summon a meteor ☄️</div>
          <p className="mt-1 text-[11px] leading-snug text-gray-400">
            Send any amount of Nano to this address and a meteor comes down on the globe for it.
          </p>
        </div>
        <img src="/donation/my_nano_donation_account.jpg" alt="QR code of the Nano tip address" className="mx-auto block w-full object-contain px-4 py-2" />
        <div className="px-4 pb-3.5">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500">Tip address</div>
          <button
            className="mt-1 w-full break-all rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left font-mono text-[11px] leading-snug text-gray-200 transition-colors hover:border-[#209ce9]/60"
            title="Copy the address"
            onClick={() => {
              navigator.clipboard?.writeText(ADDRESS).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {ADDRESS}
            <span className="mt-1 block font-sans text-[10px] uppercase tracking-[0.14em] text-[#4db8ff]">{copied ? 'Copied' : 'Click to copy'}</span>
          </button>
          <p className="mt-2.5 text-[11px] text-gray-500">
            Sent by mistake? Tell me at{' '}
            <a href="https://x.com/dalinhuang" className="text-[#4db8ff] hover:underline" target="_blank" rel="noreferrer">
              x.com/dalinhuang
            </a>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
