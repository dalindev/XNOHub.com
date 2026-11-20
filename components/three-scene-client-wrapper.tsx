'use client';

import React from 'react';
import ThreeSceneClient from './three-scene-client';
import Loader from '@/components/loading';
import { useReps } from '@/lib/reps';

const ThreeSceneClientWrapper: React.FC = () => {
  const reps = useReps();
  if (!reps) return <Loader />;
  return <ThreeSceneClient reps={reps.reps} />;
};

export default ThreeSceneClientWrapper;
