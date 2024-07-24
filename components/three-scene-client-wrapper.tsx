'use client';

import React, { useState, useEffect } from 'react';
import ThreeSceneClient from './three-scene-client';
import useNanoWebsocket from '@/hooks/use-nano-websocket';
import { IRepData } from '@/types/index';
import { RepsData } from '@/data/defualtMergedRepsData';
import { mergeRepsData } from '@/lib/merge-reps-data';
import { parseNanoAmount } from '@/lib/parse-nano-amount';
import { useConfirmations } from '@/providers/confirmation-provider';

const ThreeSceneClientWrapper: React.FC = () => {
  const [repsInfo, setRepsInfo] = useState<IRepData[]>(RepsData);
  const [serverDateTime, setServerDateTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { subscriptions } = useNanoWebsocket();
  const { addConfirmation } = useConfirmations();

  useEffect(() => {
    setServerDateTime(new Date());
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
          addConfirmation(confirmation);
        },
        error: (err) =>
          setError('Error in confirmation subscription: ' + err.message),
        complete: () => console.log('Confirmation subscription completed')
      });

      return () => {
        confirmationSubscription.unsubscribe();
      };
    }
  }, [subscriptions]);

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
