import { Suspense } from 'react';
import BuildPageClient from './BuildPageClient';

export default function BuildPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuildPageClient />
    </Suspense>
  );
}