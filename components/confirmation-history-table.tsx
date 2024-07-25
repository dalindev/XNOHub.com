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

export const ConfirmationHistoryTable = () => {
  const { confirmationHistory } = useConfirmations();
  const [currentPage, setCurrentPage] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const itemsPerPage = 10;
  const collapsedItemCount = 2;

  const formatTime = (timestamp: string) => {
    return new Date(parseInt(timestamp)).toLocaleTimeString();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-5)}`;
  };

  const getDisplayedHistory = () => {
    if (isCollapsed) {
      return confirmationHistory.slice(0, collapsedItemCount);
    }
    return confirmationHistory.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  };

  // const paginatedHistory = confirmationHistory.slice(
  //   (currentPage - 1) * itemsPerPage,
  //   currentPage * itemsPerPage
  // );

  const confirmationTimeStyle = (confirmationTime: number) => {
    if (confirmationTime < 500) return 'text-green-500';
    if (confirmationTime < 1000) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold select-none text-gray-300">
          Confirmation History
        </h2>
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
        <table className="min-w-full bg-transparent border border-gray-300 text-[14px]">
          <thead className="bg-transparent select-none">
            <tr>
              <th className="px-2 py-2 text-left">Time</th>
              <th className="px-2 py-2 text-left">Account</th>
              <th className="px-2 py-2 text-left">Amount (Ӿ)</th>
              <th className="px-2 py-2 text-left">Conf Time</th>
              <th className="px-2 py-2 text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {getDisplayedHistory().map((confirmation, index) => {
              const amount = parseNanoAmount(confirmation.message.amount);
              const style = getStyleByNanoAmount(amount);
              const confirmationTimeClasses = confirmationTimeStyle(
                Number(confirmation.message.election_info.duration)
              );
              const isDonation =
                confirmation.message.block.link_as_account ===
                NANO_LIVE_ENV.donationAccount;
              return (
                <tr
                  key={confirmation.message.hash}
                  className={isDonation ? 'bg-blue-600 text-white' : ''}
                >
                  <td className="px-2 py-2">{formatTime(confirmation.time)}</td>
                  <td className={`px-2 py-2`}>
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
                  <td className={`px-2 py-2`}>
                    <span style={{ color: style.hexColor }}>Ӿ {amount}</span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`${confirmationTimeClasses}`}>
                      {confirmation.message.election_info.duration}
                    </span>
                    <span> ms</span>
                  </td>
                  <td className="px-2 py-2">
                    {isDonation
                      ? 'Donation💰'
                      : confirmation.message.block.subtype.toLocaleUpperCase()}
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
            className="px-3 py-0 h-8 text-[16px] bg-green-500 hover:bg-green-600 text-white rounded disabled:bg-black"
          >
            Previous
          </Button>
          <span>
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
            className="px-3 py-0 h-8 text-[16px] font-normal bg-green-700 hover:bg-green-800 text-white rounded disabled:bg-black"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
