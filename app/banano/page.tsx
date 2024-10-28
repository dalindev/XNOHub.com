'use client';

import { Suspense } from 'react';
import BananoThreeSceneClientWrapper from '@/banano/components/three-scene-client-wrapper';
import { BananoConfirmationProvider } from '@/banano/providers/banano-confirmation-provider';
import Loader from '@/banano/components/loading';

export default function BananoPage() {
  return (
    <Suspense fallback={<Loader />}>
      <BananoConfirmationProvider>
        <BananoThreeSceneClientWrapper />
      </BananoConfirmationProvider>
    </Suspense>
  );
}
