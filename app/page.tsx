import { Suspense } from 'react';
import ThreeSceneClientWrapper from '@/components/three-scene-client-wrapper';

export default function Page() {
  const initialServerTime = new Date();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThreeSceneClientWrapper initialServerTime={initialServerTime} />
    </Suspense>
  );
}
