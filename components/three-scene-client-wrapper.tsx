'use client';

import React, { useState, useEffect } from 'react';
import ThreeSceneClient from './three-scene-client';
import { RepsData } from '@/data/defualtMergedRepsData';
import Loader from '@/components/loading';

const ThreeSceneClientWrapper: React.FC = () => {
  const [serverDateTime, setServerDateTime] = useState<Date | null>(null);

  useEffect(() => {
    setServerDateTime(new Date());
  }, []);

  if (RepsData.length === 0) {
    return <Loader />;
  }

  return (
    <ThreeSceneClient repsGeoInfo={RepsData} serverDateTime={serverDateTime} />
  );
};

export default ThreeSceneClientWrapper;
