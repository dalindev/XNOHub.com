'use client';

import { Suspense } from 'react';
import ThreeSceneClientWrapper from '@/components/three-scene-client-wrapper';
import { ConfirmationProvider } from '@/providers/confirmation-provider';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmationProvider>
        <ThreeSceneClientWrapper />
      </ConfirmationProvider>
    </Suspense>
  );
}
