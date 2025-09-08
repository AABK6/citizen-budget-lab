"use client"

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

type TreemapProps = {
  data: {
    name: string;
    amount: number;
    pieces: any[];
  }[];
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`${payload[0].payload.name}`}</p>
        <p className="intro">{`€${(payload[0].value / 1e9).toFixed(1)}B`}</p>
      </div>
    );
  }

  return null;
};

export const TreemapChart = ({ data }: TreemapProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey="amount"
        ratio={4 / 3}
        stroke="#fff"
        fill="#8884d8"
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};
