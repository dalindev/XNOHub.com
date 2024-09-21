'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Maximize2, Minimize2, List } from 'lucide-react';
import { ChevronDown, ChevronUp } from 'lucide-react'; // Import new icons

interface ConfirmationHistoryTableProps {}

export const ConfirmationHistoryTable: React.FC<
  ConfirmationHistoryTableProps
> = () => {
  const { confirmationHistory } = useConfirmations();
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
    <div className="space-y-4 md:px-0 w-full md:w-fit pointer-events-none">
      <div className="flex justify-end min-w-full items-center gap-2 pointer-events-auto">
        <Button
          onClick={toggleRowCount}
          variant="outline"
          size="sm"
          className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9] md:hidden pointer-events-auto"
        >
          {showLessRows ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}{' '}
          <span className="hidden md:inline">
            {showLessRows ? 'Show More' : 'Show Less'}
          </span>
        </Button>
        <Button
          onClick={toggleView}
          variant="outline"
          size="sm"
          className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9] pointer-events-auto"
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
      <div className={`overflow-hidden max-h-[75vh]`}>
        <table className="min-w-full bg-transparent border border-transparent text-[14px]">
          <thead className="bg-transparent select-none text-gray-300">
            <tr>
              {/* Render only Age and Amount columns on mobile */}
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
              <th className="p-1 md:p-2 text-left">Amount (Ӿ)</th>
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
                      {window.innerWidth >= 768 && (
                        <>
                          <td className={`p-1 md:p-2`}>
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
                    <span style={{ color: style.hexColor }}>Ӿ {amount}</span>
                  </td>
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
