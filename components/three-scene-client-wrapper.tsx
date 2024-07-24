'use client';

import React, { useState, useEffect } from 'react';
import ThreeSceneClient from './three-scene-client';
import useNanoWebsocket from '@/hooks/use-nano-websocket';
import { IRepData } from '@/types/index';
import { RepsData } from '@/data/defualtMergedRepsData';
import { mergeRepsData } from '@/lib/merge-reps-data';
import { NanoConfirmation } from '@/types/index';

export const environment = {
  production: true,
  network: 'live',
  wsUrl: 'wss://nanows.numsu.dev',
  rpcUrl: 'https://nanoproxy.numsu.dev/proxy',
  principalsUrl: 'https://nanobrowse.com/api/reps_online',
  // https://node.somenano.com/proxy?action=representatives
  explorerUrl: 'https://nanolooker.com',
  repInfoUrl: 'https://mynano.ninja'
  // hostAccount: 'nano_3zapp5z141qpjipsb1jnjdmk49jwqy58i6u6wnyrh6x7woajeyme85shxewt',
};

// {
//   "topic": "confirmation",
//   "time": "1721790974578",
//   "message": {
//       "account": "nano_14mytoo837bjozd3wizonc8qu8db533fehbbhnonf5h81a31i4ihojbiy8i1",
//       "amount": "952000000000000000000000000",
//       "hash": "DE103BF03F76B3D954DA07C6DE6EECF1C942C87B4EF2790A16CEFBA16182CDDD",
//       "confirmation_type": "active_quorum",
//       "election_info": {
//           "duration": "458",
//           "time": "1721790974571",
//           "tally": "92724677033683972877068954324283531637",
//           "final": "65863988935346425732083583196945349441",
//           "blocks": "1",
//           "voters": "68",
//           "request_count": "1"
//       },
//       "block": {
//           "type": "state",
//           "account": "nano_14mytoo837bjozd3wizonc8qu8db533fehbbhnonf5h81a31i4ihojbiy8i1",
//           "previous": "1460732E7C8D309BCB0387A17D53D7DC4DA547150E6EB6FD8A179E8CDBD45278",
//           "representative": "nano_3pnanopr3d5g7o45zh3nmdkqpaqxhhp3mw14nzr41smjz8xsrfyhtf9xac77",
//           "balance": "11255150000000000000000000000",
//           "link": "7C74939A2ABF668302B188040E2F6ADF5F21A124E7F00F7760C8EA9AFF2C6CB7",
//           "link_as_account": "nano_1z5nkgf4ohu8ie3d54163rqpoqtz68ikbszi3xup3k9cmdzkru7qtp3xrjkw",
//           "signature": "B73F6F1F6A869BCED7F3DCF654C2631CBC4174E9E26EF1F8A179F9C379AD860E39BE636183778F33D2A3D1B913FB8AF05DD51B5A0E5FA06EA76814B81D6B9E05",
//           "work": "a55deafb51ccc1ac",
//           "subtype": "receive"
//       }
//   }
// }

const ThreeSceneClientWrapper: React.FC = () => {
  const [repsInfo, setRepsInfo] = useState<IRepData[]>(RepsData);
  const [serverDateTime, setServerDateTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsUrl = environment.wsUrl; // 'wss://nanoslo.0x.no/websocket';
  const principalsUrl = environment.principalsUrl;
  const [nanoConfirmations, setNanoConfirmations] = useState<
    NanoConfirmation[]
  >([]);
  // const { subscriptions, principals } = useNanoWebsocket(wsUrl, principalsUrl);

  useEffect(() => {
    setServerDateTime(new Date());
  }, []);

  // useEffect(() => {
  //   if (subscriptions) {
  //     const confirmationSubscription = subscriptions.confirmations.subscribe({
  //       next: (confirmation) => {
  //         console.log('Received confirmation:', confirmation);
  //         // Process confirmation data here
  //       },
  //       error: (err) =>
  //         setError('Error in confirmation subscription: ' + err.message),
  //       complete: () => console.log('Confirmation subscription completed')
  //     });

  //     return () => {
  //       confirmationSubscription.unsubscribe();
  //     };
  //   }
  // }, [subscriptions]);

  // useEffect(() => {
  //   if (principals.length > 0) {
  //     try {
  //       console.log('Received principals:', principals);
  //       const mergedRepsData = mergeRepsData({
  //         onlineData: principals
  //       });
  //       setRepsInfo(mergedRepsData);
  //       setServerDateTime(new Date());
  //     } catch (error) {
  //       console.error('Error merging reps data:', error);
  //     }
  //   }
  // }, [principals]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (RepsData.length === 0) {
    return <div>Loading data...</div>;
  }

  return (
    <ThreeSceneClient repsGeoInfo={repsInfo} serverDateTime={serverDateTime} />
  );
};

export default ThreeSceneClientWrapper;
