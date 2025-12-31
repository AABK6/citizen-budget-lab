import SharePageClient from './SharePageClient'

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SharePageClient scenarioId={id} />
}
