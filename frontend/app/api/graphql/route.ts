import { NextRequest } from 'next/server'
import { resolveGraphqlUrl } from '@/lib/backend'

export async function POST(req: NextRequest) {
  const target = resolveGraphqlUrl()
  const body = await req.text()
  const headers = new Headers()
  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const auth = req.headers.get('authorization')
  if (auth) headers.set('authorization', auth)

  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    })
    const payload = await upstream.text()
    const responseHeaders = new Headers()
    const upstreamContentType = upstream.headers.get('content-type')
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType)
    return new Response(payload, { status: upstream.status, headers: responseHeaders })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Upstream request failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }
}

export function GET() {
  return new Response('Method Not Allowed', { status: 405 })
}
