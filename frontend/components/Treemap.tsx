"use client"

import { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

type TreemapItem = {
  id: string;
  name: string;
  value: number;
  amount: number;
  share: number;
  baselineAmount?: number;
  baselineShare?: number;
  deltaAmount?: number;
  unspecifiedAmount?: number;
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
  onSelect?: (item: TreemapItem) => void;
};

const defaultColors = ['#2563eb', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#a855f7', '#d946ef'];
const EPSILON = 1e-6;

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const { name, pieces } = payload[0].payload;
  const hasDescriptions = Array.isArray(pieces) && pieces.length > 0;

  return (
    <div className="custom-tooltip">
      <p className="label">{name}</p>
      {hasDescriptions && (
        <ul className="tooltip-pieces">
          {pieces.slice(0, 4).map((piece: any) => {
            const label = piece.label || piece.id;
            const description = piece.description || '';
            return (
              <li key={piece.id}>
                <span className="tooltip-piece-label">{label}</span>
                {description && <span className="tooltip-piece-separator">:</span>}
                {description && <span className="tooltip-piece-description">{description}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const CustomizedContent = (props: any) => {
  const {
    depth,
    x,
    y,
    width,
    height,
    index,
    name,
    amount,
    color,
    mode,
    onSelect,
    patternPosId,
    patternNegId,
  } = props;
  const dataValue = typeof props.value === 'number' ? props.value : (props.payload?.value ?? 0);
  const palette: string[] = props.colors?.length ? props.colors : defaultColors;
  const baseColor = color || palette[index % palette.length];
  const payload = props.payload ?? {};
  const currentAmount = Number(
    typeof amount === 'number' ? amount : (payload?.amount ?? 0),
  );
  const baselineAmount = Number(
    typeof payload?.baselineAmount === 'number' ? payload.baselineAmount : currentAmount,
  );
  const deltaAmount = Number(
    typeof payload?.deltaAmount === 'number' ? payload.deltaAmount : 0,
  );
  const unspecifiedAmountRaw = Number(payload?.unspecifiedAmount ?? 0);
  const unspecifiedAmount =
    Math.abs(deltaAmount) > EPSILON ? unspecifiedAmountRaw : 0;
  const hasOverlay =
    Math.abs(unspecifiedAmount) > EPSILON &&
    (Math.abs(deltaAmount) > EPSILON || Math.abs(baselineAmount) > EPSILON);
  const totalChange = Math.abs(deltaAmount) > EPSILON ? deltaAmount : unspecifiedAmount;
  const overlayRatio = hasOverlay
    ? Math.min(1, Math.abs(unspecifiedAmount) / Math.max(Math.abs(totalChange), EPSILON))
    : 0;
  let overlayHeight = overlayRatio > 0 ? height * overlayRatio : 0;
  if (overlayHeight > 0 && overlayHeight < 2) {
    overlayHeight = Math.min(2, height);
  } else if (overlayHeight > height) {
    overlayHeight = height;
  }
  const isIncrease = deltaAmount > 0;
  const overlayY = isIncrease ? (y + height - overlayHeight) : y;

  const overlayFill = deltaAmount >= 0 ? `url(#${patternPosId})` : `url(#${patternNegId})`;
  const overlayStroke = deltaAmount >= 0 ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.7)';

  if (process.env.NODE_ENV !== 'production' && overlayRatio > 0) {
    // eslint-disable-next-line no-console
    console.debug('[Treemap] hatch', { name, deltaAmount, unspecifiedAmount, overlayRatio });
  }

  const commonOverlay = overlayRatio > 0 && (
    <rect
      x={x}
      y={overlayY}
      width={width}
      height={overlayHeight}
      style={{
        fill: overlayFill,
        stroke: overlayStroke,
        strokeWidth: 1,
        pointerEvents: 'none',
      }}
    />
  );

  const wrapperStyle = { cursor: onSelect && props.payload?.id ? 'pointer' : 'default' };

  if (width < 50 || height < 30) {
    return (
      <g style={wrapperStyle}>
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
        {commonOverlay}
      </g>
    );
  }

  return (
    <g style={wrapperStyle}>
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
      {commonOverlay}
      <foreignObject x={x + 4} y={y + 4} width={width - 8} height={height - 8} style={{ pointerEvents: 'none' }}>
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
            {mode === 'share' ? `${(dataValue * 100).toFixed(1)}%` : `€${(currentAmount / 1e9).toFixed(1)}B`}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export const TreemapChart = ({ data, colors, resolutionData, mode, onSelect }: TreemapProps) => {
  const patternIds = useMemo(() => {
    const unique = Math.random().toString(36).slice(2, 9);
    return {
      pos: `treemap-hatch-pos-${unique}`,
      neg: `treemap-hatch-neg-${unique}`,
    };
  }, []);

  const resolutionMap = new Map<string, { target: number; specified: number }>();
  if (resolutionData) {
    for (const res of resolutionData) {
      resolutionMap.set(res.massId, {
        target: res.targetDeltaEur,
        specified: res.specifiedDeltaEur,
      });
    }
  }

  const palette = colors && colors.length ? colors : defaultColors;

  const dataWithResolution = data.map(item => {
    const fallback = resolutionMap.get(item.id);
    const fallbackTarget = fallback ? fallback.target : 0;
    const fallbackSpecified = fallback ? fallback.specified : 0;
    const hasFallbackTarget = fallback ? Math.abs(fallbackTarget) > EPSILON : false;
    const fallbackDelta = hasFallbackTarget ? fallbackTarget : fallbackSpecified;
    const fallbackUnspecified = hasFallbackTarget ? fallbackTarget - fallbackSpecified : 0;
    const baselineAmount = typeof item.baselineAmount === 'number'
      ? item.baselineAmount
      : (typeof item.amount === 'number' ? item.amount - fallbackDelta : 0);
    const deltaAmount = typeof item.deltaAmount === 'number' ? item.deltaAmount : fallbackDelta;
    const unspecifiedAmount = typeof item.unspecifiedAmount === 'number'
      ? item.unspecifiedAmount
      : (Math.abs(deltaAmount) > EPSILON ? fallbackUnspecified : 0);
    return {
      ...item,
      baselineAmount,
      deltaAmount,
      unspecifiedAmount,
      color: item.color,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={dataWithResolution}
        dataKey="value"
        aspectRatio={4 / 3}
        stroke="#fff"
        fill="#8884d8"
        isAnimationActive={false}
        content={(
          <CustomizedContent
            colors={palette}
            mode={mode}
            onSelect={onSelect}
            patternPosId={patternIds.pos}
            patternNegId={patternIds.neg}
          />
        )}
        onClick={(node: any) => {
          if (!onSelect) {
            return;
          }
          const index = typeof node?.index === 'number' ? node.index : undefined;
          if (index === undefined) {
            return;
          }
          const selected = dataWithResolution[index];
          if (selected) {
            onSelect(selected);
          }
        }}
      >
        <defs>
          <pattern
            id={patternIds.neg}
            width="0.12"
            height="0.12"
            patternUnits="objectBoundingBox"
            patternTransform="rotate(45)"
          >
            <rect width="0.5" height="1" fill="rgba(0,0,0,0.55)" />
          </pattern>
          <pattern
            id={patternIds.pos}
            width="0.12"
            height="0.12"
            patternUnits="objectBoundingBox"
            patternTransform="rotate(45)"
          >
            <rect width="0.5" height="1" fill="rgba(255,255,255,0.6)" />
          </pattern>
        </defs>
        <Tooltip content={<CustomTooltip mode={mode} />} />
      </Treemap>
    </ResponsiveContainer>
  );
};
