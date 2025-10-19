"use client";

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false }) as any;

interface MacroGrowthChartProps {
  growth: number[];
  startYear?: number;
  label?: string;
  emptyMessage?: string;
}

export function MacroGrowthChart({ growth, startYear, label = 'Δ PIB', emptyMessage = 'No data available' }: MacroGrowthChartProps) {
  const hasData = Array.isArray(growth) && growth.length > 0;

  const labels = useMemo(() => {
    if (!hasData) {
      return [];
    }
    if (typeof startYear === 'number' && Number.isFinite(startYear)) {
      return growth.map((_, idx) => String(startYear + idx));
    }
    return growth.map((_, idx) => `Y${idx}`);
  }, [growth, hasData, startYear]);

  const percentSeries = useMemo(() => {
    if (!hasData) {
      return [];
    }
    return growth.map((value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return 0;
      }
      return Number((numeric * 100).toFixed(3));
    });
  }, [growth, hasData]);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => `${value.toFixed(2)}%`,
    },
    legend: { data: [label] },
    grid: { left: 8, right: 8, top: 32, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: labels },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => `${v.toFixed(1)}%` },
      splitLine: { show: true, lineStyle: { color: 'rgba(148, 163, 184, 0.25)' } },
    },
    series: [
      {
        name: label,
        type: 'line',
        data: percentSeries,
        smooth: true,
        areaStyle: { opacity: 0.08 },
        lineStyle: { width: 2 },
        showSymbol: percentSeries.length <= 1,
      },
    ],
  }), [labels, label, percentSeries]);

  if (!hasData) {
    return (
      <div className="card fr-card empty-chart">
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return <div className="card fr-card"><ReactECharts option={option} style={{ height: 280 }} notMerge lazyUpdate /></div>;
}

export default MacroGrowthChart;
