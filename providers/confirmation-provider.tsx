import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from 'react';
import { NanoConfirmation } from '@/types/index';
import useNanoWebsocket from '@/hooks/use-nano-websocket';
import { parseNanoAmount } from '@/lib/parse-nano-amount';

interface ConfirmationContextType {
  activeConfirmations: NanoConfirmation[];
  confirmationHistory: NanoConfirmation[];
  addConfirmation: (confirmation: NanoConfirmation) => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(
  undefined
);

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [activeConfirmations, setActiveConfirmations] = useState<
    NanoConfirmation[]
  >([]);
  const [confirmationHistory, setConfirmationHistory] = useState<
    NanoConfirmation[]
  >([]);
  const { subscriptions } = useNanoWebsocket();

  const addConfirmation = useCallback((confirmation: NanoConfirmation) => {
    // Add to active confirmations
    setActiveConfirmations((prev) => [...prev, confirmation]);

    // Add to history
    setConfirmationHistory((prev) => {
      const newHistory = [confirmation, ...prev].slice(0, 200); // Keep only the latest 200
      return newHistory;
    });

    // Remove from active confirmations after duration
    setTimeout(() => {
      setActiveConfirmations((prev) => prev.filter((c) => c !== confirmation));
    }, Number(confirmation.message.election_info.duration) ?? 0);
  }, []);

  useEffect(() => {
    if (subscriptions) {
      const confirmationSubscription = subscriptions.confirmations.subscribe({
        next: (confirmation) => {
          console.log(
            `Received confirmation (${
              confirmation.message.election_info.duration
            }ms, Ӿ${parseNanoAmount(confirmation.message.amount)}):`,
            confirmation
          );
          if (parseNanoAmount(confirmation.message.amount) > 0) {
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

export const useConfirmations = () => {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error(
      'useConfirmations must be used within a ConfirmationProvider'
    );
  }
  return context;
};
