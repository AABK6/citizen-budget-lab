import { NextResponse } from 'next/server'
import { resolveBackendBase } from '@/lib/backend'

export async function GET() {
  const base = resolveBackendBase()
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
