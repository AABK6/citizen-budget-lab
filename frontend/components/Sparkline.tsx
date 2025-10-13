"use client"

import { useMemo } from 'react';

export type SparklineProps = {
  data: number[];
  width?: number | string;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string | null;
  trend?: 'positive' | 'negative' | 'neutral';
};

const DEFAULT_HEIGHT = 56;
const DEFAULT_STROKE = '#1d4ed8';

export function Sparkline({
  data,
  width = '100%',
  height = DEFAULT_HEIGHT,
  stroke = DEFAULT_STROKE,
  strokeWidth = 2,
  fill = null,
}: SparklineProps) {
  const points = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }
    if (data.length === 1) {
      return `0,50 100,50`;
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const normalized = (value - min) / range;
        const y = 100 - normalized * 100;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [data]);

  if (!points) {
    return (
      <svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="0" y1="50" x2="100" y2="50" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-hidden="true"
    >
      {fill && (
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={fill}
          opacity={0.16}
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
