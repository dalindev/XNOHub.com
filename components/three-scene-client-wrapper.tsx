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
// {
//   "topic": "confirmation",
//   "time": "1720821536797",
//   "message": {
//       "account": "nano_3ug8jkpbr35qpa1ceyf6kf7za8nirbxyiyh58iapfzrujfsi4dxf4kmbp6nq",
//       "amount": "100000000000000000000000000",
//       "hash": "F0AA4C76F6321B40E521AF416D6A9100C21341B83116F8FE4D137F87D5DFBFBD",
//       "confirmation_type": "active_quorum",
//       "block": {
//           "type": "state",
//           "account": "nano_3ug8jkpbr35qpa1ceyf6kf7za8nirbxyiyh58iapfzrujfsi4dxf4kmbp6nq",
//           "previous": "692B2D2786CB7F3C3C67B554CA02EEBBC1E693F8D7D0CAE697A6D7DD1988A9CA",
//           "representative": "nano_3hd4ezdgsp15iemx7h81in7xz5tpxi43b6b41zn3qmwiuypankocw3awes5k",
//           "balance": "36965869581599000000000000000000",
//           "link": "692B2D2786CB7F3C3C67B554CA02EEBBC1E693F8D7D0CAE697A6D7DD1988A9CA",
//           "link_as_account": "nano_1tbd7nmrfkuz9iy8hfcnsa3gxgy3wtbzjoyisdmbhbpqunerjcgcijwusd54",
//           "signature": "E2FA35ED8CF709DD6734808358475EB5C15EC3C321175E4D20F9F30C7B7D4DC5BBB7AF56A7E0D7F988A9D988EC352641351F3443F567E53625B8EC8A400DBD0A",
//           "work": "3ce614084d93b1a0",
//           "subtype": "receive"
//       }
//   }
// }
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

  // const { subscriptions, principals } = useNanoWebsocket(
  //   wsUrl,
  //   'https://httpbin.org/get'
  // );

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
