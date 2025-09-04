"use client"

import React, { useMemo } from 'react'

export type Ribbon = { pieceId: string; massId: string; amountEur: number }

export function SankeyRibbons({
  ribbons,
  pieceLabels,
  massLabels,
  maxItems = 6,
}: {
  ribbons: Ribbon[]
  pieceLabels: Record<string, string>
  massLabels: Record<string, string>
  maxItems?: number
}) {
  const { left, right, lines, maxAmt } = useMemo(() => {
    const byPiece: Record<string, number> = {}
    const byMass: Record<string, number> = {}
    for (const r of ribbons) {
      const v = Math.abs(r.amountEur)
      byPiece[r.pieceId] = (byPiece[r.pieceId] || 0) + v
      byMass[r.massId] = (byMass[r.massId] || 0) + v
    }
    const left = Object.entries(byPiece)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxItems)
      .map(([id, v], idx) => ({ id, label: pieceLabels[id] || id, value: v, idx }))
    const right = Object.entries(byMass)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxItems)
      .map(([id, v], idx) => ({ id, label: massLabels[id] || id, value: v, idx }))
    const leftIndex = Object.fromEntries(left.map((n, i) => [n.id, i])) as Record<string, number>
    const rightIndex = Object.fromEntries(right.map((n, i) => [n.id, i])) as Record<string, number>
    const lines = ribbons
      .filter(r => r.pieceId in leftIndex && r.massId in rightIndex)
      .map(r => ({ from: leftIndex[r.pieceId], to: rightIndex[r.massId], amount: r.amountEur, key: r.pieceId + '→' + r.massId }))
    const maxAmt = Math.max(1, ...lines.map(l => Math.abs(l.amount)))
    return { left, right, lines, maxAmt }
  }, [ribbons, pieceLabels, massLabels, maxItems])

  const width = 720
  const height = Math.max(left.length, right.length) * 40 + 20
  const leftX = 160
  const rightX = width - 160
  const nodeY = (i: number, total: number) => 20 + i * 40
  const stroke = (amt: number) => Math.max(1, (Math.abs(amt) / maxAmt) * 12)
  const color = (amt: number) => (amt >= 0 ? '#2CB67D' : '#D32F2F')

  return (
    <div className="fr-card fr-card--no-arrow" style={{ marginTop: '1rem' }}>
      <div className="fr-card__body">
        <div className="fr-card__title">Ribbons (lever→mass)</div>
        <div className="fr-card__desc">
          <svg width={width} height={height} role="img" aria-label="Ribbons">
            {/* Lines */}
            {lines.map((l) => {
              const y1 = nodeY(l.from, left.length)
              const y2 = nodeY(l.to, right.length)
              const path = `M ${leftX} ${y1} C ${(leftX + rightX) / 2} ${y1}, ${(leftX + rightX) / 2} ${y2}, ${rightX} ${y2}`
              return (
                <path key={l.key} d={path} stroke={color(l.amount)} strokeWidth={stroke(l.amount)} fill="none" opacity={0.7} />
              )
            })}
            {/* Left nodes */}
            {left.map((n, i) => (
              <g key={'L' + n.id}>
                <circle cx={leftX} cy={nodeY(i, left.length)} r={6} fill="#555" />
                <text x={leftX - 10} y={nodeY(i, left.length) + 4} textAnchor="end" fontSize={12}>{n.label}</text>
              </g>
            ))}
            {/* Right nodes */}
            {right.map((n, i) => (
              <g key={'R' + n.id}>
                <circle cx={rightX} cy={nodeY(i, right.length)} r={6} fill="#555" />
                <text x={rightX + 10} y={nodeY(i, right.length) + 4} textAnchor="start" fontSize={12}>{n.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}

