import { useState, useEffect, useCallback } from 'react';
import { Subject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { IRepOnline } from '@/types/index';
import { NanoConfirmation } from '@/types/index';
import { NANO_LIVE_ENV } from '@/constants/nano-live-env';

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
  const wsUrl = NANO_LIVE_ENV.wsUrl; // 'wss://nanoslo.0x.no/websocket';
  const principalsUrl = NANO_LIVE_ENV.principalsUrl;
  const [socket, setSocket] = useState<WebSocketSubject<any> | null>(null);
  const [principals, setPrincipals] = useState<IRepOnline[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscriptions | null>(
    null
  );

  const fetchPrincipals = useCallback(async () => {
    try {
      const response = await fetch(principalsUrl);
      const data = await response.json();
      setPrincipals(data);
    } catch (error) {
      console.error('Error fetching principals:', error);
    }
  }, [principalsUrl]);

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
    fetchPrincipals();
  }, [fetchPrincipals]);

  useEffect(() => {
    const newSocket = webSocket<any>(wsUrl);
    setSocket(newSocket);

    return () => {
      if (newSocket) {
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
