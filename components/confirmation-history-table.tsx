'use client';

import React, { useState } from 'react';
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
import { ChevronDown, ChevronUp } from 'lucide-react';
import { NANO_LIVE_ENV } from '@/constants/nano-live-env';
import { getRepName } from '@/lib/get-rep-name';
import { truncateAddress } from '@/lib/truncate-address';
import { formatRelativeTime } from '@/lib/format-relative-time'; // Add this import
import { NanoConfirmation } from '@/types/index';

export const ConfirmationHistoryTable = () => {
  const { confirmationHistory } = useConfirmations();
  const [currentPage, setCurrentPage] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const itemsPerPage = 10;
  const collapsedItemCount = 2;

  // Remove or comment out the formatTime function as we won't need it anymore
  // const formatTime = (timestamp: string) => {
  //   return new Date(parseInt(timestamp)).toLocaleTimeString();
  // };

  const getDisplayedHistory = () => {
    if (isCollapsed) {
      return confirmationHistory.slice(0, collapsedItemCount);
    }
    return confirmationHistory.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  };

  return (
    <div className="space-y-4 md:px-0 w-full md:w-fit">
      <div className="flex justify-end min-w-full items-center">
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          variant="outline"
          size="sm"
          className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="w-4 h-4" />
              Show More
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto select-none text-gray-400">
        <table className="min-w-full bg-transparent border border-transparent text-[14px]">
          <thead className="bg-transparent select-none">
            <tr>
              <th className="p-1 md:p-2 text-left hidden md:table-cell">Age</th>
              <th className="p-1 md:p-2 text-left hidden md:table-cell">
                Account
              </th>
              <th className="p-1 md:p-2 text-left">Amount (Ӿ)</th>
              <th className="p-1 md:p-2 text-left hidden md:table-cell">
                Representative
              </th>
              <th className="p-1 md:p-2 text-left hidden md:table-cell">
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {getDisplayedHistory().map((confirmation: NanoConfirmation) => {
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
                  <td className="p-1 md:p-2 hidden md:table-cell">
                    {formatRelativeTime(parseInt(confirmation.time))}
                  </td>
                  <td className={`p-1 md:p-2 hidden md:table-cell`}>
                    <TooltipProvider
                      skipDelayDuration={100}
                      delayDuration={0}
                      disableHoverableContent={false}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          {' '}
                          <span className="cursor-help">
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
                  <td className={`p-1 md:p-2 `}>
                    <span style={{ color: style.hexColor }}>Ӿ {amount}</span>
                  </td>
                  <td className="p-1 md:p-2  hidden md:table-cell">
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
                  <td className="p-1 md:p-2 hidden md:table-cell">
                    {isDonation ? (
                      'Donation💰'
                    ) : confirmation.message.block.subtype.toLocaleUpperCase() ===
                      'SEND' ? (
                      <span className="text-green-500">Send</span>
                    ) : (
                      <span className="text-red-500">Receive</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!isCollapsed && (
        <div className="flex justify-between items-center mt-4 select-none text-gray-400">
          <Button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 md:px-3 py-0 h-8 text-[12px] md:text-[16px] bg-transparent hover:bg-green-600 text-white rounded disabled:bg-black"
          >
            <span className="hidden md:flex">Previous</span>
            <span className="md:hidden">&lt;</span>
          </Button>
          <span className="text-[10px] md:text-[14px]">
            Page {currentPage} of{' '}
            {Math.ceil(confirmationHistory.length / itemsPerPage)}
          </span>
          <Button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(
                  prev + 1,
                  Math.ceil(confirmationHistory.length / itemsPerPage)
                )
              )
            }
            disabled={
              currentPage ===
              Math.ceil(confirmationHistory.length / itemsPerPage)
            }
            className="p-1 md:px-3 py-0 h-8 text-[12px] md:text-[16px] font-normal bg-transparent hover:bg-green-800 text-white rounded disabled:bg-black"
          >
            <span className="hidden md:flex">Next</span>
            <span className="md:hidden">&gt;</span>
          </Button>
        </div>
      )}
    </div>
  );
};
