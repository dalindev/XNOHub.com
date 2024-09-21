import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export const DonationImagePopover = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bg-transparent w-full md:w-auto max-w-full select-none text-[#209ce9] border-[#209ce9] text-sm md:text-base hover:bg-transparent hover:text-green-400 hover:border-green-400 px-2 py-1 md:px-4 md:py-2 h-auto min-h-[2.5rem] whitespace-normal text-center"
        >
          Make a small donation
          <br className="md:hidden" /> and see what happens! 😛 🌎 🚀
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] md:w-auto bg-transparent p-0 mb-2">
        <div className="flex flex-col items-center bg-black text-gray-300">
          <img
            src="/donation/my_nano_donation_account.jpg"
            alt="Nano Donation QR Code"
            className="max-w-full max-h-fit md:max-w-[510px] md:max-h-[300px] object-contain"
          />
          <p className="text-center text-[14px] my-3 text-wrap break-words w-3/4">
            nano_1osom16ctb773i6zi5fnepfro7bcmr5yqxb4qnmtzxkmdg88o4x6obmchzna
          </p>
          <p className="text-center text-sm text-[18px] select-none">
            Thank you! 🚀 🌔
          </p>
          <p className="text-center text-[12px] text-gray-400 mb-1">
            If you sending by mistake, please let me know at &nbsp;
            <a href="https://x.com/dalinhuang" className="text-[#209ce9]">
              x.com/dalinhuang
            </a>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
