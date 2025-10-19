"use client";

import React from 'react';

type SparklineProps = {
  values: number[];
  className?: string;
  stroke?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
};

export function Sparkline({
  values,
  className,
  stroke = 'currentColor',
  strokeWidth = 2,
  width = 100,
  height = 48,
}: SparklineProps) {
  const gradientId = React.useId();
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const lastValue = values[values.length - 1];
  const firstValue = values[0];

  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * (width - 2) + 1;
    let y: number;
    if (!Number.isFinite(value)) {
      y = height / 2;
    } else if (range === 0) {
      y = height / 2;
    } else {
      y = height - ((value - min) / range) * (height - 2) - 1;
    }
    return `${x},${y}`;
  });

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Sparkline from ${firstValue} to ${lastValue}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`${points.join(' ')} ${width - 1},${height} 1,${height}`}
        fill={`url(#${gradientId})`}
        opacity={0.35}
      />
    </svg>
  );
}
