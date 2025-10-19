"use client";

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false }) as any;

export type DeficitTrajectoryChartProps = {
  baseline: number[];
  scenario: number[];
  years?: number[];
  height?: number;
  className?: string;
};

function formatBillionsTick(value: number) {
  const billions = value / 1e9;
  if (!Number.isFinite(billions)) {
    return '0';
  }
  const digits = Math.abs(billions) >= 100 ? 0 : 1;
  return `${billions.toFixed(digits)} Md€`;
}

export function DeficitTrajectoryChart({ baseline, scenario, years, height = 220, className }: DeficitTrajectoryChartProps) {
  const labels = useMemo(() => {
    if (years && years.length === scenario.length && scenario.length > 0) {
      return years.map((year) => String(year));
    }
    if (scenario.length === 0) {
      return [];
    }
    return scenario.map((_, idx) => `Y${idx + 1}`);
  }, [scenario, years]);

  const alignedBaseline = useMemo(() => {
    if (scenario.length === 0) {
      return [];
    }
    if (!baseline.length) {
      return new Array(scenario.length).fill(0);
    }
    if (baseline.length === scenario.length) {
      return baseline;
    }
    const copy = baseline.slice(0, scenario.length);
    if (copy.length < scenario.length) {
      const last = copy[copy.length - 1] ?? baseline[baseline.length - 1];
      while (copy.length < scenario.length) {
        copy.push(last);
      }
    }
    return copy;
  }, [baseline, scenario]);

  const option = useMemo(() => {
    if (scenario.length === 0) {
      return null;
    }
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: number) => formatBillionsTick(value),
      },
      legend: {
        data: ['Baseline', 'Scenario'],
        top: 4,
      },
      grid: {
        left: 12,
        right: 12,
        top: 44,
        bottom: 12,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => formatBillionsTick(value),
        },
      },
      series: [
        {
          name: 'Baseline',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: '#9fa9c7' },
          itemStyle: { color: '#9fa9c7' },
          data: alignedBaseline,
        },
        {
          name: 'Scenario',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 3, color: '#1d4ed8' },
          itemStyle: { color: '#1d4ed8' },
          data: scenario,
        },
      ],
    };
  }, [alignedBaseline, labels, scenario]);

  if (scenario.length === 0 || !option) {
    return null;
  }

  return (
    <div className={className}>
      <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />
    </div>
  );
}
