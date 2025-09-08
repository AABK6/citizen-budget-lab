"use client"

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

type TreemapProps = {
  data: {
    name: string;
    amount: number;
    pieces: any[];
  }[];
  colors: string[];
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
  const { depth, x, y, width, height, index, name } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: props.colors[index % props.colors.length],
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        fill="#fff"
        fontSize={14}
      >
        {name}
      </text>
    </g>
  );
};

export const TreemapChart = ({ data, colors }: TreemapProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey="amount"
        ratio={4 / 3}
        stroke="#fff"
        fill="#8884d8"
        content={<CustomizedContent colors={colors} />}
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};
