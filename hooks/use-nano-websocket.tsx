import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject, interval } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { IRepOnline, NanoConfirmation } from '@/types/index';
import { NANO_LIVE_ENV } from '@/constants/nano-live-env';
import { RepsData } from '@/data/defualtMergedRepsData';
import { SampleConfirmationData2 } from '@/data/sampleConfirmationData';

interface Subscriptions {
  votes: Subject<Vote>;
  confirmations: Subject<NanoConfirmation>;
  stoppedElections: Subject<StoppedElection>;
}

interface Vote {
  topic: string;
  time: string;
  message: {
    account: string;
    signature: string;
    sequence: string;
    blocks: string[];
    type: string;
    timestamp: string;
  };
}

interface StoppedElection {
  topic: string;
  time: string;
  message: {
    hash: string;
  };
}

const useNanoWebsocket = () => {
  const wsUrl = useMemo(() => NANO_LIVE_ENV.wsUrl, []);
  const [socket, setSocket] = useState<WebSocketSubject<any> | null>(null);
  const [principals, setPrincipals] = useState<IRepOnline[]>(RepsData);
  const [subscriptions, setSubscriptions] = useState<Subscriptions | null>(
    null
  );

  const isLocalDevelopment = process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === 'true';
  console.log('Is local development:', isLocalDevelopment);

  const simulateConfirmations = useCallback(() => {
    if (isLocalDevelopment) {
      const confirmationSubscription = new Subject<NanoConfirmation>();
      let index = 0;

      const intervalSubscription = interval(1000).subscribe(() => {
        const confirmation = SampleConfirmationData2[index];
        confirmationSubscription.next(confirmation);
        index = (index + 1) % SampleConfirmationData2.length;
      });

      setSubscriptions({
        votes: new Subject<Vote>(),
        confirmations: confirmationSubscription,
        stoppedElections: new Subject<StoppedElection>()
      });

      return () => {
        intervalSubscription.unsubscribe();
      };
    }
  }, [isLocalDevelopment]);

  const subscribe = useCallback(() => {
    if (socket && !isLocalDevelopment) {
      const voteSubscription = new Subject<Vote>();
      const confirmationSubscription = new Subject<NanoConfirmation>();
      const stoppedElectionsSubscription = new Subject<StoppedElection>();

      socket.asObservable().subscribe((res) => {
        switch (res.topic) {
          case 'vote':
            voteSubscription.next(res);
            break;
          case 'confirmation':
            confirmationSubscription.next(res);
            break;
          case 'stopped_election':
            stoppedElectionsSubscription.next(res);
            break;
          default:
            break;
        }
      });

      socket.next({
        action: 'subscribe',
        topic: 'vote',
        options: {
          representatives: principals.map((p) => p.account)
        }
      });
      socket.next({
        action: 'subscribe',
        topic: 'confirmation',
        options: {
          all_local_accounts: 'true',
          confirmation_type: 'active',
          include_election_info: 'true',
          include_block: 'true'
        }
      });

      socket.next({
        action: 'subscribe',
        topic: 'stopped_election'
      });

      setSubscriptions({
        votes: voteSubscription,
        confirmations: confirmationSubscription,
        stoppedElections: stoppedElectionsSubscription
      });
    }
  }, [socket, principals, isLocalDevelopment]);

  useEffect(() => {
    if (isLocalDevelopment) {
      console.log('Using sample data for local development');
      return simulateConfirmations();
    } else {
      const newSocket = webSocket<any>({
        url: wsUrl,
        openObserver: {
          next: () => {
            console.log('WebSocket connection established');
          }
        },
        closeObserver: {
          next: (closeEvent) => {
            console.log('WebSocket connection closed:', closeEvent);
          }
        }
      });

      setSocket(newSocket);

      return () => {
        if (newSocket) {
          console.log('Closing WebSocket connection');
          newSocket.complete();
        }
      };
    }
  }, [wsUrl, isLocalDevelopment, simulateConfirmations]);

  useEffect(() => {
    if (socket && principals.length > 0 && !isLocalDevelopment) {
      subscribe();
    }
  }, [socket, principals, subscribe, isLocalDevelopment]);

  return { subscriptions, principals };
};

export default useNanoWebsocket;
