'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const previousHistoryLength = useRef(0);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString()
  );

  // Track newest transactions for animation
  const [newestTransaction, setNewestTransaction] = useState<string | null>(
    null
  );

  const displayedConfirmations = useMemo(() => {
    if (showLessRows && window.innerWidth < 768) {
      return confirmationHistory.slice(0, 3);
    }
    return confirmationHistory;
  }, [confirmationHistory, showLessRows]);

  useEffect(() => {
    // When new transactions arrive
    if (
      confirmationHistory.length > previousHistoryLength.current &&
      confirmationHistory.length > 0
    ) {
      // Mark the newest transaction for animation
      const newest = confirmationHistory[0];
      if (newest) {
        setNewestTransaction(`${newest.message.hash}-0`);

        // Clear the animation marker after animation completes
        setTimeout(() => {
          setNewestTransaction(null);
        }, 400); // Extended to match the animation duration
      }
    }

    previousHistoryLength.current = confirmationHistory.length;
    setLimitedHistory(displayedConfirmations.slice(0, 100));
  }, [displayedConfirmations, confirmationHistory]);

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
          <div className="transaction-container">
            {limitedHistory.map((confirmation, index) => {
              const amount = parseNanoAmount(confirmation.message.amount);
              const style = getStyleByNanoAmount(amount);
              const isDonation =
                confirmation.message.block.link_as_account ===
                APP_CONFIG.donations.nano;
              const isReceive =
                confirmation.message.block.subtype.toLowerCase() === 'receive';
              const date = new Date(parseInt(confirmation.time));

              // Check if this is the newest transaction for animation
              const txKey = `${confirmation.message.hash}-${index}`;
              const isNewest = txKey === newestTransaction;

              // Calculate staggered delay for smoother push-down effect
              // Reduced delay for more synchronized animation
              const animationDelay = `${Math.min(index * 0.02, 0.2)}s`;

              return (
                <div
                  key={txKey}
                  className={`transaction-item px-3 py-1.5 border-b border-gray-800/50 text-xs relative
                    ${isDonation ? 'bg-blue-900/30' : ''}
                    ${isNewest ? 'newest-transaction' : ''}
                    hover:bg-gray-800/40`}
                  style={{
                    animationDelay: isNewest ? '0s' : animationDelay
                  }}
                >
                  {/* Glowing overlay for newest transaction */}
                  {isNewest && (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#209ce9]/30 to-transparent z-0 glow-effect"></div>
                  )}

                  <div className="relative z-10">
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
                        {isDonation
                          ? 'Donation'
                          : isReceive
                          ? 'Receive'
                          : 'Send'}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .transaction-container {
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden; /* Prevent any overflow during animation */
        }

        .transaction-item {
          position: relative;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }

        /* The newest transaction */
        .newest-transaction {
          position: relative;
          z-index: 2;
          box-shadow: 0 0 15px rgba(32, 156, 233, 0.5);
        }

        /* When a new transaction appears, animate the sliding window effect */
        .transaction-container:has(.newest-transaction) .transaction-item {
          transform: translateY(
            0
          ); /* All items will move to their natural position */
        }

        /* The initial position of all items when a new transaction is added */
        .transaction-container:has(.newest-transaction) {
          transform: translateY(-100%); /* Start with everything shifted up */
          animation: slideWindow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .glow-effect {
          animation: glowPulse 1.5s ease-in-out infinite;
        }

        @keyframes slideWindow {
          0% {
            transform: translateY(-100px); /* Start with items shifted up */
          }
          100% {
            transform: translateY(
              0
            ); /* End with items in their natural position */
          }
        }

        @keyframes glowPulse {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmationHistoryTable;
