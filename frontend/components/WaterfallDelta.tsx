"use client"

import React from 'react'

export type WaterfallItem = { id: string; label?: string; deltaEur: number }

export function WaterfallDelta({ items, title }: { items: WaterfallItem[]; title?: string }) {
  if (!items?.length) return null
  const max = Math.max(...items.map(i => Math.abs(i.deltaEur))) || 1
  return (
    <div className="fr-card fr-card--no-arrow" style={{ marginTop: '1rem' }}>
      <div className="fr-card__body">
        <div className="fr-card__title">{title || 'Δ by Mass (Waterfall)'}</div>
        <div className="fr-card__desc">
          <div className="stack" style={{ gap: '.5rem' }}>
            {items.map((it, idx) => {
              const pct = Math.min(100, (Math.abs(it.deltaEur) / max) * 100)
              const pos = it.deltaEur >= 0
              return (
                <div key={it.id + '_' + idx}>
                  <div className="fr-grid-row fr-grid-row--gutters" style={{ alignItems: 'center' }}>
                    <div className="fr-col-3"><span className="fr-text--sm">{it.id}</span> <span className="fr-text--xs">{it.label || ''}</span></div>
                    <div className="fr-col-7">
                      <div style={{ background: '#eee', height: 10, position: 'relative' }}>
                        <div style={{ width: `${pct}%`, height: 10, background: pos ? '#2CB67D' : '#D32F2F' }} />
                      </div>
                    </div>
                    <div className="fr-col-2" style={{ textAlign: 'right' }}>
                      <span className="fr-text--xs">{(it.deltaEur).toLocaleString(undefined,{ maximumFractionDigits: 0 })} €</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

