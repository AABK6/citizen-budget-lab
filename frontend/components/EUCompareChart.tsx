"use client"

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false }) as any

type Item = { country: string; code: string; label: string; share: number }

const COFOG_COLORS: Record<string, string> = {
  '01': '#7c3aed', // General public services
  '02': '#f59e0b', // Defense
  '03': '#ef4444', // Public order
  '04': '#2563eb', // Economic affairs
  '05': '#10b981', // Environment
  '06': '#fb7185', // Housing
  '07': '#22c55e', // Health
  '08': '#06b6d4', // Recreation, culture
  '09': '#0ea5e9', // Education
  '10': '#a855f7', // Social protection
}

export function EUCompareChart({ data }: { data: Item[] }) {
  const { countries, codes, labels, series } = useMemo(() => {
    const countries = Array.from(new Set(data.map(d => d.country)))
    const codes = Array.from(new Set(data.map(d => d.code))).sort()
    const labels = codes.reduce<Record<string, string>>((acc, c) => {
      const item = data.find(d => d.code === c)
      if (item) acc[c] = item.label
      return acc
    }, {})
    // Map: code -> series data per country
    const series = codes.map(code => {
      const row = countries.map(c => {
        const it = data.find(d => d.country === c && d.code === code)
        const pct = it ? it.share * 100 : 0
        return Number.isFinite(pct) ? Number(pct.toFixed(2)) : 0
      })
      return { code, data: row }
    })
    return { countries, codes, labels, series }
  }, [data])

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const name = params[0]?.name || ''
        const lines = params
          .filter(p => typeof p.value === 'number' && p.value > 0)
          .map(p => {
            const [code, ...rest] = String(p.seriesName || '').split(' ')
            const label = rest.join(' ')
            return `${code} ${label}: ${p.value}%`
          })
        return `<b>${name}</b><br/>${lines.join('<br/>')}`
      }
    },
    legend: { type: 'scroll' },
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: (v: number) => `${v}%` }
    },
    yAxis: { type: 'category', data: countries },
    series: series.map(s => ({
      name: `${s.code} ${labels[s.code] || ''}`.trim(),
      type: 'bar',
      stack: 'cofog',
      emphasis: { focus: 'series' },
      itemStyle: { color: COFOG_COLORS[s.code] || undefined },
      data: s.data
    }))
  }), [countries, series, labels])

  return (
    <div className="card fr-card">
      <ReactECharts option={option} style={{ height: 420 }} notMerge={true} lazyUpdate={true} />
    </div>
  )
}
