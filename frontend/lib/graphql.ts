export const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql'

export async function gqlRequest(query: string, variables?: Record<string, any>): Promise<any> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const js = await res.json()
  if (js.errors) throw new Error(js.errors.map((e: any) => e.message).join('; '))
  return js.data
}

