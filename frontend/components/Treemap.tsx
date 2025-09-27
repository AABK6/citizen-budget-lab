"use client"

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

type TreemapItem = {
  id: string;
  name: string;
  value: number;
  amount: number;
  share: number;
  color?: string;
  pieces: any[];
};

type TreemapProps = {
  data: TreemapItem[];
  colors?: string[];
  resolutionData: {
    massId: string;
    targetDeltaEur: number;
    specifiedDeltaEur: number;
  }[];
  mode: 'amount' | 'share';
};

const defaultColors = ['#2563eb', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#a855f7', '#d946ef'];

const CustomTooltip = ({ active, payload, mode }: any) => {
  if (active && payload && payload.length) {
    const { name, pieces, amount, share } = payload[0].payload;
    const valueLine = mode === 'share'
      ? `${(payload[0].value * 100).toFixed(1)}% of baseline`
      : `€${(payload[0].value / 1e9).toFixed(1)}B`;
    const secondaryLine = mode === 'share'
      ? `€${(amount / 1e9).toFixed(1)}B baseline`
      : `${(share * 100).toFixed(1)}% of baseline`;
    return (
      <div className="custom-tooltip">
        <p className="label">{`${name}`}</p>
        <p className="intro">{valueLine}</p>
        <p className="secondary">{secondaryLine}</p>
        <ul className="tooltip-pieces">
          {pieces.slice(0, 3).map((piece: any) => (
            <li key={piece.id}>{piece.label}</li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
};

const CustomizedContent = (props: any) => {
  const { depth, x, y, width, height, index, name, amount, value, unresolvedPct, color, mode } = props;
  const palette: string[] = props.colors?.length ? props.colors : defaultColors;
  const baseColor = color || palette[index % palette.length];

  // Don't render text in very small boxes
  if (width < 50 || height < 30) {
    return (
       <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: baseColor,
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
        />
        {unresolvedPct > 0 && (
          <rect
            x={x}
            y={y}
            width={width}
            height={height * unresolvedPct}
            style={{
              fill: 'url(#pattern-stripe)',
            }}
          />
        )}
      </g>
    )
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: baseColor,
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {unresolvedPct > 0 && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height * unresolvedPct}
          style={{
            fill: 'url(#pattern-stripe)',
          }}
        />
      )}
      <foreignObject x={x + 4} y={y + 4} width={width - 8} height={height - 8}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordWrap: 'break-word',
          }}
        >
          <div>{name}</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            {mode === 'share' ? `${(value * 100).toFixed(1)}%` : `€${(amount / 1e9).toFixed(1)}B`}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export const TreemapChart = ({ data, colors, resolutionData, mode }: TreemapProps) => {
  const resolutionMap = new Map<string, number>();
  if (resolutionData) {
    for (const res of resolutionData) {
      const target = Math.abs(res.targetDeltaEur);
      const specified = Math.abs(res.specifiedDeltaEur);
      if (target > 0) {
        const unresolvedPct = Math.max(0, (target - specified) / target);
        resolutionMap.set(res.massId, unresolvedPct);
      }
    }
  }

  const palette = colors && colors.length ? colors : defaultColors;

  const dataWithResolution = data.map(item => ({
    ...item,
    unresolvedPct: resolutionMap.get(item.id) || 0,
    color: item.color,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={dataWithResolution}
        dataKey="value"
        aspectRatio={4 / 3}
        stroke="#fff"
        fill="#8884d8"
        content={<CustomizedContent colors={palette} mode={mode} />}
      >
        <defs>
          <pattern id="pattern-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" transform="translate(0,0)" fill="rgba(255,255,255,0.4)"></rect>
          </pattern>
        </defs>
        <Tooltip content={<CustomTooltip mode={mode} />} />
      </Treemap>
    </ResponsiveContainer>
  );
};
