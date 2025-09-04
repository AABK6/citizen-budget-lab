"use client"

import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false }) as any

type Row = { code: string; label: string; amountEur: number; share: number }
type Props = {
  rows: Row[]
  kind: 'sunburst' | 'treemap' | 'stacked'
  onSliceClick?: (code: string, label: string) => void
}

export function AllocationChart({ rows, kind, onSliceClick }: Props) {
  const data = useMemo(() => rows.map(r => ({
    name: `${r.code} ${r.label}`,
    value: Math.max(0, r.amountEur || 0),
    code: r.code,
    label: r.label,
    share: r.share,
  })), [rows])

  const option = useMemo(() => {
    const common = {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => {
          const v = p.data || {}
          const amt = (v.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
          const sh = typeof v.share === 'number' ? (v.share * 100).toFixed(2) + '%' : ''
          return `<b>${v.code || ''} ${v.label || p.name || ''}</b><br/>Amount: €${amt}<br/>Share: ${sh}`
        }
      },
      series: [] as any[]
    }
    if (kind === 'sunburst') {
      common.series = [{
        type: 'sunburst',
        data,
        radius: [0, '90%'],
        sort: undefined,
        emphasis: { focus: 'ancestor' },
        label: { show: false }
      }]
    } else if (kind === 'treemap') {
      common.series = [{
        type: 'treemap',
        data,
        roam: false,
        breadcrumb: { show: false },
        label: { show: false }
      }]
    } else {
      // 100% stacked bar: one category with segments representing shares
      const yName = 'Composition'
      const series = rows.map(r => ({
        name: `${r.code} ${r.label}`,
        type: 'bar',
        stack: 'shares',
        data: [Math.max(0, r.share || 0)],
        emphasis: { focus: 'series' },
      }))
      return {
        tooltip: {
          trigger: 'item',
          formatter: (p: any) => {
            const i = p.seriesName || ''
            const share = (p.data * 100).toFixed(2) + '%'
            return `<b>${i}</b><br/>Share: ${share}`
          }
        },
        legend: { show: false },
        grid: { left: 20, right: 20, top: 10, bottom: 30, containLabel: true },
        xAxis: { type: 'value', max: 1, axisLabel: { formatter: (v: number) => (v * 100) + '%' } },
        yAxis: { type: 'category', data: [yName] },
        series,
      }
    }
    return common
  }, [data, kind])

  const onEvents = React.useMemo(() => ({
    click: (p: any) => {
      const v = p?.data || {}
      if (onSliceClick) onSliceClick(v.code || '', v.label || p?.name || '')
    }
  }), [onSliceClick])

  return (
    <div className="card fr-card">
      <ReactECharts option={option} style={{ height: 360 }} notMerge={true} lazyUpdate={true} onEvents={onEvents} />
    </div>
  )
}
