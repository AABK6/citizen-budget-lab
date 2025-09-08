"use client"

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

type TreemapProps = {
  data: {
    id: string;
    name: string;
    amount: number;
    pieces: any[];
  }[];
  colors: string[];
  resolutionData: {
    massId: string;
    targetDeltaEur: number;
    specifiedDeltaEur: number;
  }[];
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { name, pieces } = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="label">{`${name}`}</p>
        <p className="intro">{`€${(payload[0].value / 1e9).toFixed(1)}B`}</p>
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
  const { depth, x, y, width, height, index, name, amount, unresolvedPct } = props;
  const baseColor = props.colors[index % props.colors.length];

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
            {`€${(amount / 1e9).toFixed(1)}B`}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export const TreemapChart = ({ data, colors, resolutionData }: TreemapProps) => {
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

  const dataWithResolution = data.map(item => ({
    ...item,
    unresolvedPct: resolutionMap.get(item.id) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={dataWithResolution}
        dataKey="amount"
        ratio={4 / 3}
        stroke="#fff"
        fill="#8884d8"
        content={<CustomizedContent colors={colors} />}
      >
        <defs>
          <pattern id="pattern-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="8" transform="translate(0,0)" fill="rgba(255,255,255,0.4)"></rect>
          </pattern>
        </defs>
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};
