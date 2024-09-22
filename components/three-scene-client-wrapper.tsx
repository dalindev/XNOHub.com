'use client';

import React, { useState, useEffect } from 'react';
import ThreeSceneClient from './three-scene-client';
// import { IRepData } from '@/types/index';
import { RepsData } from '@/data/defualtMergedRepsData';

const ThreeSceneClientWrapper: React.FC = () => {
  // const [repsInfo, setRepsInfo] = useState<IRepData[]>(RepsData);
  const [serverDateTime, setServerDateTime] = useState<Date | null>(null);
  // const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setServerDateTime(new Date());
  }, []);

  // if (error) {
  //   return <div>Error: {error}</div>;
  // }

  if (RepsData.length === 0) {
    return <div className="font-[40px]">Loading data... Ӿ Ӿ Ӿ ...</div>;
  }

  return (
    <ThreeSceneClient repsGeoInfo={RepsData} serverDateTime={serverDateTime} />
  );
};

export default ThreeSceneClientWrapper;
