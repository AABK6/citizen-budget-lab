"use client"

import { useEffect, useState } from 'react'

type Health = {
  ok: boolean
  target?: string
  backend?: string
  warehouse?: { ready?: boolean; missing?: string[] }
}

export function HealthBadge() {
  const [h, setH] = useState<Health | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function run() {
      try {
        const r = await fetch('/api/health', { cache: 'no-store' })
        const js = await r.json()
        if (alive) setH(js)
      } catch (e: any) {
        if (alive) setErr(String(e))
      }
    }
    run()
    const id = setInterval(run, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const ok = !!h?.ok
  const ready = !!h?.warehouse?.ready
  const missing = (h?.warehouse?.missing || []).length
  const color = ok ? (ready ? '#1f7a1f' : '#e6a700') : '#d32f2f'
  const title = ok
    ? (ready ? 'API OK • Entrepôt prêt' : `API OK • Entrepôt en préparation (${missing} manquants)`)
    : (err ? `API indisponible • ${err}` : 'API indisponible')

  return (
    <span title={title} aria-label={title} style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
      <span style={{ width: 10, height: 10, borderRadius: 6, background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 12, color: '#555' }}>API</span>
    </span>
  )
}
