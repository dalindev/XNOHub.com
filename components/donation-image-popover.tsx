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
          className="bg-transparent select-none text-[#209ce9] border-[#209ce9] text-[16px] hover:bg-transparent hover:text-green-400 hover:border-green-400"
        >
          Make a small Donation and see what happens! 😛 🌎 🚀
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto bg-transparent p-0 mb-4">
        <div className="flex flex-col items-center bg-transparent text-gray-300">
          <img
            src="/donation/my_nano_donation_account.jpg"
            alt="Nano Donation QR Code"
            className="max-w-[600px] max-h-[300px] object-contain"
          />
          <p className="text-sm text-center text-[18px] mt-6 select-none">
            Scan to donate Nano
          </p>
          <p className="text-center text-[14px] my-3">
            nano_1osom16ctb773i6zi5fnepfro7bcmr5yqxb4qnmtzxkmdg88o4x6obmchzna
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
