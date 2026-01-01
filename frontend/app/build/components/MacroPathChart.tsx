import { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { ScenarioResult } from '@/lib/types';

interface MacroPathChartProps {
    scenarioResult: ScenarioResult | null;
    year: number;
}

export function MacroPathChart({ scenarioResult, year }: MacroPathChartProps) {
    const data = useMemo(() => {
        // Default / Placeholder data if no result
        if (!scenarioResult?.accounting) {
            return [
                { year: year, deficit: -5.0, growth: 1.0 },
                { year: year + 1, deficit: -4.5, growth: 1.2 },
                { year: year + 2, deficit: -4.0, growth: 1.4 },
                { year: year + 3, deficit: -3.5, growth: 1.5 },
            ];
        }

        const acc = scenarioResult.accounting;
        const deficitRatios = acc.deficitRatioPath || [];
        const gdpPath = acc.gdpPath || [];
        
        // We assume paths start at `year` (2026)
        return deficitRatios.slice(0, 4).map((def, i) => {
            // Calculate growth: if i=0, use a baseline assumption or 0 if missing previous
            // Ideally we need previous year GDP to compute y0 growth. 
            // If gdpPath starts at y0, we can only compute growth for y1+.
            // For y0, we might look at macro.deltaGDP or just use 1.0% placeholder if missing.
            let growth = 0;
            if (gdpPath.length > i && i > 0) {
                const prev = gdpPath[i - 1];
                const curr = gdpPath[i];
                growth = ((curr - prev) / prev) * 100;
            } else if (i === 0 && gdpPath.length > 0) {
                 // Fallback: 1% assumption for first year if we lack t-1
                 growth = 1.1; 
            }

            return {
                year: year + i,
                deficit: def * 100, // Convert to %
                growth: growth
            };
        });
    }, [scenarioResult, year]);

    return (
        <div className="w-full h-full flex flex-col justify-center">
            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1 px-1">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500/50"></span>
                    Déficit
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-1 bg-emerald-500 rounded-full"></span>
                    Croissance
                </span>
            </div>
            <div className="h-10 w-full opacity-90">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <XAxis hide dataKey="year" />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                            contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '8px' }}
                            itemStyle={{ padding: 0 }}
                            formatter={(value: number) => value.toFixed(1) + '%'}
                            labelStyle={{ display: 'none' }}
                        />
                        <ReferenceLine y={-3} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.5} />
                        
                        {/* Deficit Area (Inverted usually, but here Deficit is negative) */}
                        <Area 
                            type="monotone" 
                            dataKey="deficit" 
                            fill="#6366f1" 
                            fillOpacity={0.2} 
                            stroke="#6366f1" 
                            strokeWidth={2}
                        />
                        
                        {/* Growth Line */}
                        <Line 
                            type="monotone" 
                            dataKey="growth" 
                            stroke="#10b981" 
                            strokeWidth={2} 
                            dot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
