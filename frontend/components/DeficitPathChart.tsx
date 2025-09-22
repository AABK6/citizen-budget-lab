"use client"

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false }) as any

type DeficitPathChartProps = {
  deficit: number[];
  debt: number[];
  startYear?: number;
};

export function DeficitPathChart({ deficit, debt, startYear }: DeficitPathChartProps) {
  const labels = useMemo(() => {
    if (typeof startYear === 'number' && Number.isFinite(startYear)) {
      return deficit.map((_, idx) => String(startYear + idx));
    }
    return deficit.map((_, i) => `Y${i}`);
  }, [deficit, startYear]);

  const option = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Deficit', 'Debt'] },
    grid: { left: 8, right: 8, top: 24, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 1e9).toFixed(0)}B€` } },
    series: [
      { name: 'Deficit', type: 'line', data: deficit, smooth: true },
      { name: 'Debt', type: 'line', data: debt, smooth: true }
    ]
  }), [deficit, debt, labels])
  return (
    <div className="card fr-card">
      <ReactECharts option={option} style={{ height: 280 }} notMerge lazyUpdate />
    </div>
  )}
