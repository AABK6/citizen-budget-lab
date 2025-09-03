"use client"

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false }) as any

export function DeficitPathChart({ deficit, debt }: { deficit: number[]; debt: number[] }) {
  const option = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Deficit Δ', 'Debt Δ'] },
    grid: { left: 8, right: 8, top: 24, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: deficit.map((_, i) => `Y${i}`) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v/1e9).toFixed(0)}B€` } },
    series: [
      { name: 'Deficit Δ', type: 'line', data: deficit, smooth: true },
      { name: 'Debt Δ', type: 'line', data: debt, smooth: true }
    ]
  }), [deficit, debt])
  return (
    <div className="card">
      <ReactECharts option={option} style={{ height: 280 }} notMerge lazyUpdate />
    </div>
  )}

