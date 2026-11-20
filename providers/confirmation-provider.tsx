import React, { createContext, useContext, useEffect, useState } from 'react';
import { NanoConfirmation } from '@/types/index';
import { acquireFeed, onConfirmation, onFeedStatus } from '@/lib/feed/bus';
import type { FeedStatus } from '@/lib/feed/protocol';

// React side of the feed: only the latest-100 history list (for the table and
// rocket launches) and the connection status. The 3D arcs read the feed bus
// directly and never go through React state.

interface ConfirmationContextType {
  confirmationHistory: NanoConfirmation[];
  feedStatus: FeedStatus;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(
  undefined
);

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [confirmationHistory, setConfirmationHistory] = useState<NanoConfirmation[]>([]);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>({ state: 'idle' });

  useEffect(() => {
    const release = acquireFeed();
    const offConf = onConfirmation((c) =>
      setConfirmationHistory((prev) => [c, ...prev].slice(0, 100))
    );
    const offStatus = onFeedStatus(setFeedStatus);
    return () => {
      offConf();
      offStatus();
      release();
    };
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirmationHistory, feedStatus }}>
      {children}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmations = () => {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error('useConfirmations must be used within a ConfirmationProvider');
  }
  return context;
};
