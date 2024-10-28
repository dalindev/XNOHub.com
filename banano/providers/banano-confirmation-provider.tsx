import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from 'react';
import { NanoConfirmation } from '@/types/index';
import useBananoWebsocket from '@/banano/hooks/use-banano-websocket';
import { parseBananoAmount } from '@/banano/lib/parse-banano-amount';

interface BananoConfirmationContextType {
  activeConfirmations: NanoConfirmation[];
  confirmationHistory: NanoConfirmation[];
  addConfirmation: (confirmation: NanoConfirmation) => void;
}

const ConfirmationContext = createContext<
  BananoConfirmationContextType | undefined
>(undefined);

export const BananoConfirmationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [activeConfirmations, setActiveConfirmations] = useState<
    NanoConfirmation[]
  >([]);
  const [confirmationHistory, setConfirmationHistory] = useState<
    NanoConfirmation[]
  >([]);
  const { subscriptions } = useBananoWebsocket();

  const addConfirmation = useCallback((confirmation: NanoConfirmation) => {
    setActiveConfirmations((prev) => [...prev, confirmation]);
    setConfirmationHistory((prev) => {
      const newHistory = [confirmation, ...prev].slice(0, 100); // Keep only the latest 100
      return newHistory;
    });
    setTimeout(() => {
      setActiveConfirmations((prev) => prev.filter((c) => c !== confirmation));
    }, Number(500) ?? 0);
  }, []);

  useEffect(() => {
    // console.log('Subscriptions:', subscriptions);
    if (subscriptions) {
      const confirmationSubscription = subscriptions.confirmations.subscribe({
        next: (confirmation) => {
          if (parseBananoAmount(confirmation.message.amount) > 0) {
            addConfirmation(confirmation);
          }
        },
        error: (err) =>
          console.error('Error in confirmation subscription:', err.message),
        complete: () => console.log('Confirmation subscription completed')
      });

      return () => {
        confirmationSubscription.unsubscribe();
      };
    }
  }, [subscriptions, addConfirmation]);

  return (
    <ConfirmationContext.Provider
      value={{ activeConfirmations, confirmationHistory, addConfirmation }}
    >
      {children}
    </ConfirmationContext.Provider>
  );
};

export const useBananoConfirmations = () => {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error(
      'useBananoConfirmations must be used within a BananoConfirmationProvider'
    );
  }
  return context;
};
