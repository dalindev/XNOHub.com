import { Suspense } from 'react';
import ThreeSceneClientWrapper from '@/components/three-scene-client-wrapper';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThreeSceneClientWrapper />
    </Suspense>
  );
}
