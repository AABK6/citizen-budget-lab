import { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, LineChart } from 'recharts';
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
                // Calculate Nominal Growth then subtract ~1.8% inflation proxy to show Real Growth
                const nominal = ((curr - prev) / prev) * 100;
                growth = nominal - 1.8;
            } else if (i === 0 && gdpPath.length > 0) {
                 // Fallback: 1% assumption for first year if we lack t-1
                 growth = 0.9; 
            }

            return {
                year: year + i,
                deficit: def * 100, // Convert to %
                growth: growth
            };
        });
    }, [scenarioResult, year]);

    return (
        <div className="w-full h-full grid grid-cols-2 gap-4">
            {/* Deficit Chart */}
            <div className="flex flex-col h-full">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1 px-1">
                    Déficit (% PIB)
                </div>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="gradDef" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            <XAxis 
                                dataKey="year" 
                                tick={{ fontSize: 9, fill: '#94a3b8' }} 
                                tickLine={false}
                                axisLine={false}
                                interval={0}
                            />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                                itemStyle={{ color: '#fff', padding: 0 }}
                                formatter={(value: number) => value.toFixed(1) + '%'}
                                labelStyle={{ display: 'none' }}
                            />
                            <ReferenceLine y={-3} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.5} />
                            <Area
                                type="monotone"
                                dataKey="deficit"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fill="url(#gradDef)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Growth Chart */}
            <div className="flex flex-col h-full border-l border-slate-100 pl-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1 px-1">
                    Croissance (%)
                </div>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <XAxis 
                                dataKey="year" 
                                tick={{ fontSize: 9, fill: '#94a3b8' }} 
                                tickLine={false}
                                axisLine={false}
                                interval={0}
                            />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                                itemStyle={{ color: '#fff', padding: 0 }}
                                formatter={(value: number) => value.toFixed(1) + '%'}
                                labelStyle={{ display: 'none' }}
                            />
                            <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                            <Line
                                type="monotone"
                                dataKey="growth"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 2, fill: '#10b981' }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

// Add LineChart and AreaChart imports if needed, but ComposedChart usually covers them. 
// Re-checking imports.
