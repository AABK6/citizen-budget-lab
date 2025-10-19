"use client";

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false }) as any;

type DeficitPathChartProps = {
  deficit: number[];
  debt: number[];
  startYear?: number;
  emptyMessage?: string;
};

export function DeficitPathChart({ deficit, debt, startYear, emptyMessage = 'No data available' }: DeficitPathChartProps) {
  const hasData = Array.isArray(deficit) && deficit.length > 0;

  const labels = useMemo(() => {
    if (!hasData) {
      return [];
    }
    if (typeof startYear === 'number' && Number.isFinite(startYear)) {
      return deficit.map((_, idx) => String(startYear + idx));
    }
    return deficit.map((_, i) => `Y${i}`);
  }, [deficit, hasData, startYear]);

  const option = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Deficit', 'Debt'] },
    grid: { left: 8, right: 8, top: 24, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 1e9).toFixed(0)}B€` } },
    series: [
      { name: 'Deficit', type: 'line', data: deficit, smooth: true },
      { name: 'Debt', type: 'line', data: debt, smooth: true },
    ],
  }), [deficit, debt, labels]);

  if (!hasData) {
    return (
      <div className="card fr-card empty-chart">
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="card fr-card">
      <ReactECharts option={option} style={{ height: 280 }} notMerge lazyUpdate />
    </div>
  );
}
