// Always use a same-origin proxy endpoint to avoid CORS/mixed-content issues.
// Next.js rewrites map `/api/graphql` to the real backend URL (see next.config.js).
export const GRAPHQL_URL = '/api/graphql'

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
