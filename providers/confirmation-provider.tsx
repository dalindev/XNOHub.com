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

    // create type for this:

    // {
    //     "topic": "confirmation",
    //     "time": "1722230032943",
    //     "message": {
    //         "account": "nano_1tipnanogsu7q59pnie3qfc4w378wm43fg4ksqc8wmnnfnizrq1xrpt5geho",
    //         "amount": "3752000000000000000000000000",
    //         "hash": "5ECDF2BDFB4DE31FC39EE0C267B3192270CF3F5E4C33FB675F2010F86A1DA9F4",
    //         "confirmation_type": "active_quorum",
    //         "block": {
    //             "type": "state",
    //             "account": "nano_1tipnanogsu7q59pnie3qfc4w378wm43fg4ksqc8wmnnfnizrq1xrpt5geho",
    //             "previous": "7763F149524FFE88411234CF1F1A7C1D33D47E045333A595AB10E7E33F8189D9",
    //             "representative": "nano_1tipnanogsu7q59pnie3qfc4w378wm43fg4ksqc8wmnnfnizrq1xrpt5geho",
    //             "balance": "101090550791003523401275528777782",
    //             "link": "46BDDD7107B08A2852F5D598137CB088D2697BE01CE0D8A99DD23FCCBAAAF68C",
    //             "link_as_account": "nano_1joxuorihe6c73bhdoer4fyd348kf7xy1991u4nsunjzskxcoxnem7gx8k4o",
    //             "signature": "FD423655742A5FF6D7DB2E83536F1B67AFF017C0A26CD7ABB1CFE5D0D5638527C5789CDFF61027C01ABC6CD724F104CAA45246A9F1C7DD7B313227875DE88A01",
    //             "work": "e03cd856d9719463",
    //             "subtype": "send"
    //         }
    //     }
    // }

    // Remove from active confirmations after duration
    setTimeout(() => {
      setActiveConfirmations((prev) => prev.filter((c) => c !== confirmation));
    }, Number(500) ?? 0);
  }, []);

  useEffect(() => {
    console.log('Subscriptions:', subscriptions);
    if (subscriptions) {
      const confirmationSubscription = subscriptions.confirmations.subscribe({
        next: (confirmation) => {
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
