import { redirect } from 'next/navigation';

export default function SharePage({ params }: { params: { id: string } }) {
  const scenarioId = encodeURIComponent(params.id);
  redirect(`/build?scenarioId=${scenarioId}`);
}
