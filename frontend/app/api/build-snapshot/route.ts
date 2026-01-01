import { NextRequest } from 'next/server'
import { resolveBackendBase } from '@/lib/backend'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const year = url.searchParams.get('year')
  const base = resolveBackendBase()
  const target = `${base}/build-snapshot${year ? `?year=${encodeURIComponent(year)}` : ''}`

  try {
    const upstream = await fetch(target, { method: 'GET', cache: 'no-store' })
    const payload = await upstream.text()
    const headers = new Headers()
    const contentType = upstream.headers.get('content-type')
    if (contentType) headers.set('content-type', contentType)
    const cacheControl = upstream.headers.get('cache-control')
    if (cacheControl) headers.set('cache-control', cacheControl)
    return new Response(payload, { status: upstream.status, headers })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Upstream request failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }
}
