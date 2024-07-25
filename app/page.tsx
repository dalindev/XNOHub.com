'use client';

import { Suspense } from 'react';
import ThreeSceneClientWrapper from '@/components/three-scene-client-wrapper';
import { ConfirmationProvider } from '@/providers/confirmation-provider';
import Loader from '@/components/loading';

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <ConfirmationProvider>
        <ThreeSceneClientWrapper />
      </ConfirmationProvider>
    </Suspense>
  );
}
