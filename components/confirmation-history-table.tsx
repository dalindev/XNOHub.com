'use client';

import React, { useState, useEffect } from 'react';
import { useConfirmations } from '@/providers/confirmation-provider';
import { parseNanoAmount } from '@/lib/parse-nano-amount';
import { getStyleByNanoAmount } from '@/lib/get-style-by-nano-amount';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { NANO_LIVE_ENV } from '@/constants/nano-live-env';
import { getRepName } from '@/lib/get-rep-name';
import { truncateAddress } from '@/lib/truncate-address';
import { formatRelativeTime } from '@/lib/format-relative-time';
import { NanoConfirmation } from '@/types/index';
import { Maximize2, Minimize2 } from 'lucide-react';

export const ConfirmationHistoryTable = () => {
  const { confirmationHistory } = useConfirmations();
  const [isFullView, setIsFullView] = useState(false);
  const [limitedHistory, setLimitedHistory] = useState<NanoConfirmation[]>([]);

  useEffect(() => {
    // Keep only the latest 100 records
    setLimitedHistory(confirmationHistory.slice(0, 100));
  }, [confirmationHistory]);

  const toggleView = () => {
    setIsFullView(!isFullView);
  };

  return (
    <div className="space-y-4 md:px-0 w-full md:w-fit">
      <div className="flex justify-end min-w-full items-center">
        <Button
          onClick={toggleView}
          variant="outline"
          size="sm"
          className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
        >
          {isFullView ? (
            <>
              <Minimize2 className="w-4 h-4" />
              Min View
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              Full View
            </>
          )}
        </Button>
      </div>
      <div className="overflow-hidden h-[80vh]">
        <table className="min-w-full bg-transparent border border-transparent text-[14px]">
          <thead className="bg-transparent select-none text-gray-300">
            <tr>
              {isFullView && (
                <>
                  <th className="p-1 md:p-2 text-left">Age</th>
                  <th className="p-1 md:p-2 text-left">Account</th>
                </>
              )}
              <th className="p-1 md:p-2 text-left">Amount (Ӿ)</th>
              {isFullView && (
                <>
                  <th className="p-1 md:p-2 text-left">Representative</th>
                  <th className="p-1 md:p-2 text-left">Type</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {limitedHistory.map((confirmation: NanoConfirmation) => {
              const amount = parseNanoAmount(confirmation.message.amount);
              const style = getStyleByNanoAmount(amount);
              const isDonation =
                confirmation.message.block.link_as_account ===
                NANO_LIVE_ENV.donationAccount;
              const repName = getRepName(
                confirmation.message.block.representative
              );
              return (
                <tr
                  key={confirmation.message.hash}
                  className={isDonation ? 'bg-blue-600 text-white' : ''}
                >
                  {isFullView && (
                    <>
                      <td className="p-1 md:p-2 text-gray-400">
                        {formatRelativeTime(parseInt(confirmation.time))}
                      </td>
                      <td className={`p-1 md:p-2`}>
                        <TooltipProvider
                          skipDelayDuration={100}
                          delayDuration={0}
                          disableHoverableContent={false}
                        >
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="cursor-help text-gray-400">
                                {truncateAddress(confirmation.message.account)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black">
                              <span className="bg-black text-white border-1 border-gray-300 p-2 select-text">
                                {confirmation.message.account}
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </>
                  )}
                  <td className={`p-1 md:p-2 ${isFullView ? '' : 'w-full'}`}>
                    <span style={{ color: style.hexColor }}>Ӿ {amount}</span>
                  </td>
                  {isFullView && (
                    <>
                      <td className="p-1 md:p-2">
                        <span
                          className={`${
                            repName ? 'text-[#ffa31a]' : 'text-gray-400'
                          }`}
                        >
                          {repName ??
                            truncateAddress(
                              confirmation.message.block.representative
                            )}
                        </span>
                      </td>
                      <td className="p-1 md:p-2">
                        {isDonation ? (
                          'Donation💰'
                        ) : confirmation.message.block.subtype.toLocaleUpperCase() ===
                          'SEND' ? (
                          <span className="text-red-500">Send</span>
                        ) : (
                          <span className="text-green-500">Receive</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConfirmationHistoryTable;
