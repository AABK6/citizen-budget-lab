import { NextResponse } from 'next/server'

function backendBase(): string {
  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql'
  return url.replace(/\/?graphql$/i, '')
}

export async function GET() {
  const base = backendBase()
  const target = `${base}/health`
  try {
    const r = await fetch(target, { cache: 'no-store' })
    const js = await r.json().catch(() => ({}))
    const ok = r.ok && (js?.status === 'healthy')
    return NextResponse.json({ ok, target: base, backend: js?.status || 'unknown', warehouse: js?.warehouse || {} }, { status: ok ? 200 : 503 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, target: base, error: String(e) }, { status: 503 })
  }
}

