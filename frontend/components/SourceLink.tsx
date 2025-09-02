"use client"

import React, { useEffect, useState } from 'react'
import { gqlRequest } from '@/lib/graphql'

type Source = { id: string; datasetName: string; url: string; license: string; refreshCadence: string; vintage: string }

export function SourceLink({ ids }: { ids?: string[] }) {
  const [sources, setSources] = useState<Source[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const q = `query { sources { id datasetName url license refreshCadence vintage } }`
        const data = await gqlRequest(q)
        const arr: Source[] = data.sources || []
        let out = arr
        if (ids && ids.length) {
          const set = new Set(ids)
          out = arr.filter(s => set.has(s.id))
        }
        if (!cancelled) setSources(out)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load sources')
      }
    }
    load()
    return () => { cancelled = true }
  }, [JSON.stringify(ids || [])])

  if (error) return <span aria-live="polite">⚠ Sources</span>
  if (!sources.length) return <a href="/sources" aria-label="Sources">☆ Sources</a>
  return (
    <span className="row gap" aria-label="Source datasets">
      {sources.map(s => (
        <a key={s.id} href={s.url} target="_blank" rel="noreferrer" title={`${s.datasetName} — ${s.vintage}`} aria-label={`Source: ${s.datasetName}`}>
          ★ {s.datasetName}
        </a>
      ))}
    </span>
  )
}

