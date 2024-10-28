'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useBananoConfirmations } from '@/banano/providers/banano-confirmation-provider';
import { parseBananoAmount } from '@/banano/lib/parse-banano-amount';
import { getStyleByBananoAmount } from '@/banano/lib/get-style-by-banano-amount';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { BANANO_LIVE_ENV } from '@/banano/constants/banano-live-env';
import { getBananoRepName } from '@/banano/lib/get-banano-rep-name';
import { truncateAddress } from '@/lib/truncate-address';
import { formatRelativeTime } from '@/lib/format-relative-time';
import { NanoConfirmation } from '@/types/index';
import { Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react';

interface BananoConfirmationHistoryTableProps {}

export const BananoConfirmationHistoryTable: React.FC<
  BananoConfirmationHistoryTableProps
> = () => {
  const { confirmationHistory } = useBananoConfirmations();
  const [isFullView, setIsFullView] = useState(false);
  const [limitedHistory, setLimitedHistory] = useState<NanoConfirmation[]>([]);
  const [showLessRows, setShowLessRows] = useState(true);

  const displayedConfirmations = useMemo(() => {
    if (showLessRows && window.innerWidth < 768) {
      return confirmationHistory.slice(0, 3);
    }
    return confirmationHistory;
  }, [confirmationHistory, showLessRows]);

  useEffect(() => {
    setLimitedHistory(displayedConfirmations.slice(0, 100));
  }, [displayedConfirmations]);

  const toggleView = () => {
    setIsFullView(!isFullView);
  };

  const toggleRowCount = () => {
    setShowLessRows(!showLessRows);
  };

  return (
    <div className="space-y-4 w-full md:w-auto pointer-events-none select-none">
      <div className="flex justify-end items-center gap-2 pointer-events-auto">
        <Button
          onClick={toggleRowCount}
          variant="outline"
          size="sm"
          className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9] md:hidden"
        >
          {showLessRows ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          <span className="hidden md:inline">
            {showLessRows ? 'Show More' : 'Show Less'}
          </span>
        </Button>
        <Button
          onClick={toggleView}
          variant="outline"
          size="sm"
          className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
        >
          {isFullView ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="hidden md:inline">Min View</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span className="hidden md:inline">Full View</span>
            </>
          )}
        </Button>
      </div>
      <div className="overflow-hidden max-h-[75vh] md:max-w-[700px] lg:max-w-[800px] md:ml-auto justify-end flex">
        <table className="w-fit bg-transparent border border-transparent text-[14px]">
          <thead className="bg-transparent select-none text-gray-300">
            <tr>
              {isFullView && (
                <>
                  <th className="p-1 md:p-2 text-left">Age</th>
                  {window.innerWidth >= 768 && (
                    <>
                      <th className="p-1 md:p-2 text-left">Account</th>
                      <th className="p-1 md:p-2 text-left">Representative</th>
                      <th className="p-1 md:p-2 text-left">Type</th>
                    </>
                  )}
                </>
              )}
              <th className="p-1 md:p-2 text-left">
                <div className="flex items-center">
                  <span className="mr-1">Amount</span>
                  <img src="/banano/BAN.svg" className="w-4 h-4" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {limitedHistory.map(
              (confirmation: NanoConfirmation, index: number) => {
                const amount = parseBananoAmount(confirmation.message.amount);
                const style = getStyleByBananoAmount(amount);
                const isDonation =
                  confirmation.message.block.link_as_account ===
                  BANANO_LIVE_ENV.donationAccount;
                const repName = getBananoRepName(
                  confirmation.message.block.representative
                );
                return (
                  <tr
                    key={`${confirmation.message.hash}-${index}`}
                    className={isDonation ? 'bg-blue-600 text-white' : ''}
                  >
                    {isFullView && (
                      <>
                        <td className="p-1 md:p-2 text-gray-400">
                          {formatRelativeTime(parseInt(confirmation.time))}
                        </td>
                        {window.innerWidth >= 768 && (
                          <>
                            <td className="p-1 md:p-2">
                              <TooltipProvider
                                skipDelayDuration={100}
                                delayDuration={0}
                                disableHoverableContent={false}
                              >
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="cursor-help text-gray-400">
                                      {truncateAddress(
                                        confirmation.message.account
                                      )}
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
                      </>
                    )}
                    <td className={`p-1 md:p-2 ${isFullView ? '' : 'w-full'}`}>
                      <div
                        style={{ color: style.hexColor }}
                        className="flex items-center"
                      >
                        <img src="/banano/BAN.svg" className="w-4 h-4 mr-1" />
                        <span>{amount}</span>
                      </div>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BananoConfirmationHistoryTable;
