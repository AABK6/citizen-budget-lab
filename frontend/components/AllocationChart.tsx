"use client"

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false }) as any

type Row = { code: string; label: string; amountEur: number; share: number }
type Props = {
  rows: Row[]
  kind: 'sunburst' | 'treemap'
}

export function AllocationChart({ rows, kind }: Props) {
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
    } else {
      common.series = [{
        type: 'treemap',
        data,
        roam: false,
        breadcrumb: { show: false },
        label: { show: false }
      }]
    }
    return common
  }, [data, kind])

  return (
    <div className="card">
      <ReactECharts option={option} style={{ height: 360 }} notMerge={true} lazyUpdate={true} />
    </div>
  )
}

