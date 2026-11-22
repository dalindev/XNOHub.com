import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

export const DonationImagePopover = () => {
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
      <PopoverContent className="mb-2 w-[90vw] overflow-hidden rounded-xl border border-white/10 bg-black/80 p-0 shadow-2xl backdrop-blur-md md:w-auto">
        <div className="flex flex-col items-center pb-2 text-gray-300">
          <img
            src="/donation/my_nano_donation_account.jpg"
            alt="Nano Donation QR Code"
            className="max-w-full max-h-fit md:max-w-[510px] md:max-h-[300px] object-contain"
          />
          <p className="text-center text-[14px] my-3 text-wrap break-words w-3/4">
            nano_1osom16ctb773i6zi5fnepfro7bcmr5yqxb4qnmtzxkmdg88o4x6obmchzna
          </p>
          <p className="text-center text-base md:text-[18px] text-green-600 select-none">
            Summon meteors ☄️, confuse dinos 🦕!<br></br> Rockets? What rockets?
            🚀
          </p>
          <p className="text-center text-[12px] text-gray-400 mb-1">
            Sent by mistake? Let me know at &nbsp;
            <a
              href="https://x.com/dalinhuang"
              className="text-[#209ce9]"
              target="_blank"
            >
              x.com/dalinhuang
            </a>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
