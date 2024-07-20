'use client';

import React, { useState, useEffect } from 'react';
import ThreeSceneClient from './three-scene-client';
import useNanoWebsocket from '@/hooks/use-nano-websocket';
import { IRepData } from '@/types/index';
import { RepsData } from '@/data/defualtMergedRepsData';

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

// Received vote:
// {
//   "topic": "vote",
//   "time": "1720821215738",
//   "message": {
//       "account": "nano_37ortkby6k68z8tkk8g63ndbp8wjbmofhn56oyxb4rm6s3x51pkpiwcnpgmq",
//       "signature": "6338185331417388429342847820729208186083101460526705934626374078492212822288926274408339628101154085623920343617062916355570846420369642139174993052221705",
//       "sequence": "18446744073709551615",
//       "timestamp": "18446744073709551615",
//       "duration": "15",
//       "blocks": [
//           "21FADAF8D53B2E8F31989476FB74DB33D9BB0851014B8B33E2DD170C7F49AD51"
//       ],
//       "type": "vote"
//   }
// }

// Nano Foundation #3
// {
//   "topic": "vote",
//   "time": "1721012896983",
//   "message": {
//       "account": "nano_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p",
//       "signature": "2557275631242862995372204112869250643558527901054196110021563257636943961549060203842310621958442979295593518945936804193292372999963897153338700091630092",
//       "sequence": "1721012896960",
//       "timestamp": "1721012896960",
//       "duration": "9",
//       "blocks": [
//           "75C57CE64748B63295424C5E3FB2C3E44DE8DBB8B98319AA9179803FE03248CF"
//       ],
//       "type": "vote"
//   }
// }

// Received confirmation:
// {
//   "topic": "confirmation",
//   "time": "1720821323361",
//   "message": {
//       "account": "nano_11tikb8iji6hdqfcfdcypoy9ekfj5he7p1m5qrc3njskfx819ax5a31ku9eb",
//       "amount": "158114000000000030000000000000",
//       "hash": "C3A0FC225B0CBC3A2D240B561FAF111C450A921117C750E8A57CD02951D44718",
//       "confirmation_type": "active_quorum"
//   }
// }
// Received confirmation:

// Received stopped election:
// {
//   "topic": "stopped_election",
//   "time": "1720821332499",
//   "message": {
//       "hash": "D99E0B483544391EEFD0B8EE3206A0D7366958BA6AF269126FDFF6A3D046E03E"
//   }
// }

interface ThreeSceneClientWrapperProps {
  initialServerTime: Date;
}

const ThreeSceneClientWrapper: React.FC<ThreeSceneClientWrapperProps> = ({
  initialServerTime
}) => {
  const [data, setData] = useState<IRepData[]>([]);
  const [serverDateTime, setServerDateTime] = useState<Date>(initialServerTime);
  const [error, setError] = useState<string | null>(null);

  const wsUrl = environment.wsUrl; // 'wss://nanoslo.0x.no/websocket';
  const principalsUrl = environment.principalsUrl;

  // const { subscriptions, principals } = useNanoWebsocket(wsUrl, principalsUrl);

  // useEffect(() => {
  //   if (subscriptions) {
  //     // const voteSubscription = subscriptions.votes.subscribe({
  //     //   next: (vote) => {
  //     //     console.log('Received vote:', vote);
  //     //     // Process vote data here
  //     //   },
  //     //   error: (err) => setError('Error in vote subscription: ' + err.message),
  //     //   complete: () => console.log('Vote subscription completed')
  //     // });

  //     // const confirmationSubscription = subscriptions.confirmations.subscribe({
  //     //   next: (confirmation) => {
  //     //     console.log('Received confirmation:', confirmation);
  //     //     // Process confirmation data here
  //     //   },
  //     //   error: (err) =>
  //     //     setError('Error in confirmation subscription: ' + err.message),
  //     //   complete: () => console.log('Confirmation subscription completed')
  //     // });

  //     // const stoppedElectionSubscription =
  //     //   subscriptions.stoppedElections.subscribe({
  //     //     next: (stoppedElection) => {
  //     //       console.log('Received stopped election:', stoppedElection);
  //     //     },
  //     //     error: (err) =>
  //     //       setError('Error in stopped election subscription: ' + err.message),
  //     //     complete: () => console.log('Stopped election subscription completed')
  //     //   });

  //     // Cleanup function to unsubscribe when component unmounts
  //     return () => {
  //       // voteSubscription.unsubscribe();
  //       // confirmationSubscription.unsubscribe();
  //       // stoppedElectionSubscription.unsubscribe();
  //     };
  //   }
  // }, [subscriptions]);

  // useEffect(() => {
  //   if (principals.length > 0) {
  //     console.log('Received principals:', principals);
  //     // setData(
  //     //   principals.map((p) => ({
  //     //     rep_address: p.account,
  //     //     alias: p.alias,
  //     //     weight: p.votingweight
  //     //     // Add other fields as needed
  //     //   }))
  //     // );
  //     setServerDateTime(new Date());
  //   }
  // }, [principals]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (RepsData.length === 0) {
    return <div>Loading data...</div>;
  }

  return (
    <ThreeSceneClient
      repsGeoInfo={RepsData as IRepData[]}
      serverDateTime={serverDateTime}
    />
  );
};

export default ThreeSceneClientWrapper;
