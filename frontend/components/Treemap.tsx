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

const CustomTooltip = ({ active, payload, mode }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const { name, pieces, amount, share } = data;

  // Format Value
  const displayValue = mode === 'share'
    ? `${((share || 0) * 100).toFixed(1)}%`
    : `${((amount || 0) / 1e9).toFixed(1)} Md€`;

  const topPieces = (pieces || []).slice(0, 5);
  const remaining = (pieces || []).length - topPieces.length;

  return (
    <div className="min-w-[200px] max-w-[280px] bg-white/95 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl p-3 font-['Outfit'] animate-in fade-in zoom-in-95 duration-150 z-50 pointer-events-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <h4 className="text-sm font-bold text-slate-800 leading-tight">{name}</h4>
        <span className="text-xs font-mono font-bold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
          {displayValue}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        {topPieces.map((piece: any, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <div className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 flex-shrink-0 shadow-sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-slate-600 leading-tight truncate">
                {piece.label || piece.id}
              </p>
              {piece.description && (
                <p className="text-[9px] text-slate-400 leading-tight line-clamp-1 opacity-80">
                  {piece.description}
                </p>
              )}
            </div>
            {/* Show amount for top pieces if significant? Optional, keeping it clean for now */}
          </div>
        ))}
        {remaining > 0 && (
          <div className="flex items-center gap-2 pl-3">
            <span className="text-[10px] font-medium text-slate-400 italic">
              + {remaining} autres postes...
            </span>
          </div>
        )}
      </div>


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
    typeof props.baselineAmount === 'number' ? props.baselineAmount :
      (typeof payload?.baselineAmount === 'number' ? payload.baselineAmount : currentAmount),
  );
  const deltaAmount = Number(
    typeof props.deltaAmount === 'number' ? props.deltaAmount :
      (typeof payload?.deltaAmount === 'number' ? payload.deltaAmount : 0),
  );
  const unspecifiedAmountRaw = Number(payload?.unspecifiedAmount ?? 0);
  const unspecifiedAmount =
    Math.abs(deltaAmount) > EPSILON ? unspecifiedAmountRaw : 0;



  // Overlay Logic (Hatching)
  const totalChange = Math.abs(deltaAmount) > EPSILON ? deltaAmount : unspecifiedAmount;
  const overlayRatio = (Math.abs(unspecifiedAmount) > EPSILON && (Math.abs(deltaAmount) > EPSILON || Math.abs(baselineAmount) > EPSILON))
    ? Math.min(1, Math.abs(unspecifiedAmount) / Math.max(Math.abs(totalChange), EPSILON))
    : 0;

  // No gap for sharp corners
  const GAP = 0;

  let overlayHeight = overlayRatio > 0 ? height * overlayRatio : 0;
  if (overlayHeight > 0 && overlayHeight < 2) overlayHeight = Math.min(2, height);
  else if (overlayHeight > height) overlayHeight = height;

  const isIncrease = deltaAmount > 0;
  const overlayY = isIncrease ? (y + height - overlayHeight) : y;
  const overlayFill = deltaAmount >= 0 ? `url(#${patternPosId})` : `url(#${patternNegId})`;
  const overlayStroke = deltaAmount >= 0 ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  // Hover & Interaction Style
  const wrapperStyle = {
    cursor: onSelect && props.payload?.id ? 'pointer' : 'default',
    // No drop shadow by default for clean flat look, maybe add on hover
    zIndex: onSelect ? 10 : 1
  };

  // Skip tiny blocks
  if (width < 20 || height < 20) {
    // Just a colored rect, no text, no border stroke overload
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={baseColor}
          stroke="none"
        />
      </g>
    );
  }

  // Label Logic
  const showName = width > 40 && height > 25;
  const showAmount = width > 70 && height > 50;

  return (
    <g
      style={wrapperStyle}
      className={`transition-all duration-200 ease-out origin-center ${onSelect ? 'hover:brightness-110 hover:z-50 hover:shadow-lg' : ''}`}
    >
      {/* 1. Base Color Block - Sharp Corners */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={baseColor}
        stroke="#fff"
        strokeWidth={1}
        style={{ cursor: onSelect ? 'pointer' : 'default' }}
        onClick={(e) => {
          if (onSelect && props.payload?.id) onSelect(props.payload);
        }}
      />

      {/* 2. Hatching Overlay (Target Gap) */}
      {overlayRatio > 0 && (
        <rect
          x={x}
          y={overlayY}
          width={width}
          height={overlayHeight}
          fill={overlayFill}
          stroke={overlayStroke}
          strokeWidth={0}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* 4. Content Label - Dynamic Sizing */}
      {width > 25 && height > 25 && (
        <foreignObject x={x + 2} y={y + 2} width={width - 4} height={height - 4} style={{ pointerEvents: 'none' }}>
          <div className="w-full h-full flex flex-col justify-start p-0.5 select-none text-white antialiased overflow-hidden">
            {(() => {
              const minDim = Math.min(width, height);
              // Dynamic font scaling: 
              // Cap max size to 18px to match medium blocks like "Travail & emploi"
              // Small blocks (40px) -> ~10-11px
              const titleFontSize = Math.max(10, Math.min(18, minDim / 6));
              const amountFontSize = Math.max(9, titleFontSize * 0.75);

              // Estimate lines based on height available vs font size
              // (Rough approximation: line-height is ~1.1em)
              const availableHeightForTitle = height - amountFontSize - 8;
              const maxLines = Math.max(1, Math.floor(availableHeightForTitle / (titleFontSize * 1.1)));

              return (
                <>
                  <div
                    className="font-bold leading-[1.1] break-words"
                    style={{
                      fontSize: `${titleFontSize}px`,
                      display: '-webkit-box',
                      WebkitLineClamp: maxLines,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {name}
                  </div>
                  {/* Only show amount if there's reasonable vertical space left or if box is large enough */}
                  {height > 40 && (
                    <div
                      className="font-medium opacity-90 leading-tight mt-0.5"
                      style={{ fontSize: `${amountFontSize}px` }}
                    >
                      {mode === 'share' ? `${(dataValue * 100).toFixed(1)}%` : `€${(currentAmount / 1e9).toFixed(1)} Md`}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </foreignObject>
      )}

      {/* 5. Modified Indicator (Badge or Dot) */}
      {Math.abs(deltaAmount) > EPSILON && width > 30 && height > 30 && (
        <foreignObject
          x={x}
          y={y}
          width={width}
          height={height}
          style={{ pointerEvents: 'none' }}
        >
          <div className="w-full h-full relative">
            {(() => {
              const percentVal = baselineAmount !== 0 ? (deltaAmount / baselineAmount) * 100 : 0;
              const isPositive = percentVal >= 0;
              // Show full badge if block is large enough, otherwise just a dot
              const showBadge = width > 70 && height > 45;

              if (showBadge) {
                return (
                  <div className="absolute bottom-1 right-1 bg-white/95 backdrop-blur-sm shadow-sm rounded px-1.5 py-0.5 flex items-center border border-gray-200/50">
                    <span className={`text-[10px] font-bold leading-none ${isPositive ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {isPositive ? '+' : ''}{percentVal.toFixed(1)}%
                    </span>
                  </div>
                );
              }

              // Dot fallback for smaller blocks
              return (
                <div className="absolute bottom-1 right-1 bg-white/90 shadow-sm rounded-full p-0.5">
                  <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                </div>
              );
            })()}
          </div>
        </foreignObject>
      )}
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
    const newItem = {
      ...item,
      baselineAmount,
      deltaAmount,
      unspecifiedAmount,
      color: item.color,
    };
    return newItem;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        onClick={(node: any) => {
          if (onSelect && node) {
            const item = node.payload || node;
            // Ensure it's a valid item with ID before selecting
            if (item && item.id) onSelect(item);
          }
        }}
        data={dataWithResolution}
        dataKey="value"
        aspectRatio={16 / 9}
        stroke="transparent"
        fill="transparent"
        // Animation
        isAnimationActive={true}
        animationDuration={500}
        animationEasing="ease-out"
        content={(
          <CustomizedContent
            colors={palette}
            mode={mode}
            onSelect={onSelect}
            patternPosId={patternIds.pos}
            patternNegId={patternIds.neg}
          />
        )}
      >
        <defs>
          <pattern
            id={patternIds.neg}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="8" fill="rgba(0,0,0,0.15)" />
          </pattern>
          <pattern
            id={patternIds.pos}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="8" fill="rgba(255,255,255,0.25)" />
          </pattern>

          {/* Glass Gloss Gradient - Stronger and Simpler */}
          <linearGradient id="treemap-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="30%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <Tooltip content={<CustomTooltip mode={mode} />} wrapperStyle={{ pointerEvents: 'none' }} />
      </Treemap>
    </ResponsiveContainer>
  );
};
