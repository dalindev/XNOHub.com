'use client';

import React, { useState, useEffect } from 'react';
import ThreeSceneClient from '@/banano/components/three-scene-client';
import { RepsData } from '@/banano/data/defualtMergedBananoRepsData';

const ThreeSceneClientWrapper: React.FC = () => {
  const [serverDateTime, setServerDateTime] = useState<Date | null>(null);

  useEffect(() => {
    setServerDateTime(new Date());
  }, []);

  if (RepsData.length === 0) {
    return <div className="font-[40px]">Connecting to Banano network...</div>;
  }

  return (
    <ThreeSceneClient repsGeoInfo={RepsData} serverDateTime={serverDateTime} />
  );
};

export default ThreeSceneClientWrapper;
