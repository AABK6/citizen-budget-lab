import { Suspense } from 'react';
import type { Metadata } from 'next';
import BuildPageClient from './BuildPageClient';

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ scenarioId?: string }>;
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const scenarioId = resolvedSearchParams?.scenarioId;
  const shortId = scenarioId ? scenarioId.slice(0, 8) : null;
  const title = shortId ? `Votre budget citoyen - ${shortId}` : 'Votre budget citoyen';
  const description =
    'Partagez votre budget pour donner plus de poids a la consultation citoyenne.';
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const metadataBase = new URL(base);
  const ogImage = scenarioId ? `/api/og/${scenarioId}` : '/api/og/demo';

  return {
    title,
    description,
    metadataBase,
    openGraph: {
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function BuildPage() {
  return (
    <Suspense fallback={<div>Chargement…</div>}>
      <BuildPageClient />
    </Suspense>
  );
}
