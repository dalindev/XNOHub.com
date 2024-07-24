'use client';

import React, { useState } from 'react';
import { useConfirmations } from '@/providers/confirmation-provider';
import { parseNanoAmount } from '@/lib/parse-nano-amount';
import { getStyleByNanoAmount } from '@/lib/get-style-by-nano-amount';

export const ConfirmationHistoryTable = () => {
  const { confirmationHistory } = useConfirmations();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatTime = (timestamp: string) => {
    return new Date(parseInt(timestamp)).toLocaleTimeString();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-5)}`;
  };

  const paginatedHistory = confirmationHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const confirmationTimeStyle = (confirmationTime: number) => {
    if (confirmationTime < 1000) return 'text-green-500';
    if (confirmationTime < 2000) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-transparent border border-gray-300 text-[14px]">
        <thead className="bg-transparent">
          <tr>
            <th className="px-2 py-2 text-left">Time</th>
            <th className="px-2 py-2 text-left">Account</th>
            <th className="px-2 py-2 text-left">Amount (Ӿ)</th>
            <th className="px-2 py-2 text-left">Conf Time</th>
            <th className="px-2 py-2 text-left">Type</th>
          </tr>
        </thead>
        <tbody>
          {paginatedHistory.map((confirmation, index) => {
            const amount = parseNanoAmount(confirmation.message.amount);
            const { hexColor } = getStyleByNanoAmount(amount);
            const confirmationTimeClasses = confirmationTimeStyle(
              Number(confirmation.message.election_info.duration)
            );

            return (
              <tr key={confirmation.message.hash}>
                <td className="px-2 py-2">{formatTime(confirmation.time)}</td>
                <td className={`px-2 py-2`}>
                  {truncateAddress(confirmation.message.account)}
                </td>
                <td className={`px-2 py-2`}>
                  <span className={`text-[${hexColor}]`}>Ӿ {amount}</span>
                </td>
                <td className="px-2 py-2">
                  <span className={`${confirmationTimeClasses}`}>
                    {confirmation.message.election_info.duration}
                  </span>
                  <span> ms</span>
                </td>
                <td className="px-2 py-2">
                  {confirmation.message.block.subtype.toLocaleUpperCase()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded disabled:bg-black"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of{' '}
          {Math.ceil(confirmationHistory.length / itemsPerPage)}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) =>
              Math.min(
                prev + 1,
                Math.ceil(confirmationHistory.length / itemsPerPage)
              )
            )
          }
          disabled={
            currentPage === Math.ceil(confirmationHistory.length / itemsPerPage)
          }
          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded disabled:bg-black"
        >
          Next
        </button>
      </div>
    </div>
  );
};
