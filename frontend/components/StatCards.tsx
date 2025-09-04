"use client"

import React from 'react'

export type StatCard = {
  label: string
  value: string
  hint?: string
}

export function StatCards({ items }: { items: StatCard[] }) {
  return (
    <div className="row gap" aria-label="statistics">
      {items.map((it, idx) => (
        <div key={idx} className="card" style={{ padding: '.75rem 1rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{it.label}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{it.value}</div>
          {it.hint && <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{it.hint}</div>}
        </div>
      ))}
    </div>
  )
}
