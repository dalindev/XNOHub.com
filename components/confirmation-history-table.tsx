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
import { getRepName } from '@/lib/get-rep-name';
import { truncateAddress } from '@/lib/truncate-address';
import { formatRelativeTime } from '@/lib/format-relative-time';
import { NanoConfirmation } from '@/types/index';
import {
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { APP_CONFIG } from '@/constants/config';

interface ConfirmationHistoryTableProps {}

export const ConfirmationHistoryTable: React.FC<
  ConfirmationHistoryTableProps
> = () => {
  const { confirmationHistory } = useConfirmations();
  const [isFullView, setIsFullView] = useState(false);
  const [limitedHistory, setLimitedHistory] = useState<NanoConfirmation[]>([]);
  const [showLessRows, setShowLessRows] = useState(true);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString()
  );

  const displayedConfirmations = useMemo(() => {
    if (showLessRows && window.innerWidth < 768) {
      return confirmationHistory.slice(0, 3);
    }
    return confirmationHistory;
  }, [confirmationHistory, showLessRows]);

  useEffect(() => {
    setLimitedHistory(displayedConfirmations.slice(0, 100));
  }, [displayedConfirmations]);

  // Update the clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleView = () => {
    setIsFullView(!isFullView);
  };

  const toggleRowCount = () => {
    setShowLessRows(!showLessRows);
  };

  return (
    <div className="bg-black/70 backdrop-blur-sm rounded-lg shadow-lg border-t border-l border-[#209ce9]/30 w-80 h-full flex flex-col">
      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-[#209ce9] font-semibold flex items-center">
          {isFullView ? (
            <Maximize2
              className="h-4 w-4 mr-2 cursor-pointer"
              onClick={toggleView}
            />
          ) : (
            <Minimize2
              className="h-4 w-4 mr-2 cursor-pointer"
              onClick={toggleView}
            />
          )}
          <Clock className="h-4 w-4 mr-2" />
          Transaction Stream
        </h3>
        <div className="flex items-center">
          <span className="text-xs text-gray-400 mr-2">Real-Time</span>
          <span className="text-xs bg-[#209ce9]/20 text-[#209ce9] px-1 rounded">
            {currentTime}
          </span>
          <button
            onClick={toggleRowCount}
            className="text-[#209ce9] hover:text-white flex items-center text-xs ml-2"
          >
            {showLessRows ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      <div
        className={`overflow-y-auto flex-1 ${isFullView ? 'h-[600px]' : ''}`}
      >
        {displayedConfirmations.length === 0 ? (
          <div className="p-3 text-gray-400 text-center text-sm">
            Waiting for transactions...
          </div>
        ) : (
          limitedHistory.map((confirmation, index) => {
            const amount = parseNanoAmount(confirmation.message.amount);
            const style = getStyleByNanoAmount(amount);
            const isDonation =
              confirmation.message.block.link_as_account ===
              APP_CONFIG.donations.nano;
            const isReceive =
              confirmation.message.block.subtype.toLowerCase() === 'receive';
            const date = new Date(parseInt(confirmation.time));

            return (
              <div
                key={`${confirmation.message.hash}-${index}`}
                className={`px-3 py-1.5 hover:bg-gray-800/40 border-b border-gray-800/50 text-xs ${
                  isDonation ? 'bg-blue-900/30' : ''
                }`}
              >
                <div className="flex justify-between text-gray-500">
                  <span>{date.toLocaleDateString()}</span>
                  <span>{date.toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center mt-1">
                  <span
                    className={`${
                      isDonation
                        ? 'text-[#ffa31a]'
                        : isReceive
                        ? 'text-green-400'
                        : 'text-rose-400'
                    } mr-2`}
                  >
                    {isDonation ? 'Donation' : isReceive ? 'Receive' : 'Send'}
                  </span>
                  <span className="text-white mr-1">from</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="cursor-pointer"
                          style={{ color: style.hexColor }}
                        >
                          {truncateAddress(confirmation.message.account)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-gray-900 text-white text-xs p-1"
                      >
                        {confirmation.message.account}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex justify-between text-gray-400 mt-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`${
                            getRepName(
                              confirmation.message.block.representative
                            )
                              ? 'text-[#209ce9]'
                              : 'text-gray-400'
                          } cursor-pointer`}
                        >
                          {getRepName(
                            confirmation.message.block.representative
                          ) ||
                            truncateAddress(
                              confirmation.message.block.representative
                            )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-gray-900 text-white text-xs p-1"
                      >
                        {confirmation.message.block.representative}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span
                    className="font-medium"
                    style={{ color: style.hexColor }}
                  >
                    {amount} NANO
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConfirmationHistoryTable;
