import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { IRepOnline } from '@/types/index';
import { NanoConfirmation } from '@/types/index';
import { NANO_LIVE_ENV } from '@/constants/nano-live-env';
import { RepsData } from '@/data/defualtMergedRepsData';

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
  // const principalsUrl = useMemo(() => NANO_LIVE_ENV.principalsUrl, []);
  // const principalsUrl = NANO_LIVE_ENV.principalsUrl;
  const [socket, setSocket] = useState<WebSocketSubject<any> | null>(null);
  const [principals, setPrincipals] = useState<IRepOnline[]>(RepsData);
  const [subscriptions, setSubscriptions] = useState<Subscriptions | null>(
    null
  );

  // const fetchPrincipals = useCallback(async () => {
  //   try {
  //     const response = await fetch(principalsUrl);
  //     const data = await response.json();
  //     setPrincipals(data);
  //   } catch (error) {
  //     console.error('Error fetching principals:', error);
  //   }
  // }, [principalsUrl]);

  const subscribe = useCallback(() => {
    if (socket) {
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
            console.log('confirmation:', res);
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
  }, [socket, principals]);

  useEffect(() => {
    console.log('Attempting to connect to WebSocket:', wsUrl);
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

    newSocket.subscribe({
      next: (msg) => console.log('Received message:', msg),
      error: (err) => console.error('WebSocket error:', err),
      complete: () => console.log('WebSocket connection completed')
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        console.log('Closing WebSocket connection');
        newSocket.complete();
      }
    };
  }, [wsUrl]);

  useEffect(() => {
    if (socket && principals.length > 0) {
      subscribe();
    }
  }, [socket, principals, subscribe]);

  return { subscriptions, principals };
};

export default useNanoWebsocket;
