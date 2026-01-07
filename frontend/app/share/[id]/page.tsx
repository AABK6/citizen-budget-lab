import { redirect } from 'next/navigation';

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const scenarioId = encodeURIComponent(resolvedParams.id);
  redirect(`/build?scenarioId=${scenarioId}`);
}
