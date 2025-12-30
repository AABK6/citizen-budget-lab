import type { PolicyLever } from '../types';
import { ImpactBadge } from '@/components/reform/ImpactBadge';
import { DistributionChart } from '@/components/reform/DistributionChart';

interface ReformSidebarListProps {
    onSelectReform: (reform: PolicyLever) => void;
    levers: PolicyLever[];
    onHoverReform?: (reformId: string | null) => void;
    isLeverSelected: (id: string) => boolean;
}

export function ReformSidebarList({ onSelectReform, levers, onHoverReform, isLeverSelected }: ReformSidebarListProps) {
    return (
        <div className="space-y-3 p-1 animate-in slide-in-from-left-4 duration-300">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-2">Réformes Structurelles</div>

            {levers.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm italic">
                    Aucune réforme disponible.
                </div>
            )}

            {levers.map((lever) => {
                const isSelected = isLeverSelected(lever.id);
                return (
                    <button
                        key={lever.id}
                        onClick={() => onSelectReform(lever)}
                        onMouseEnter={() => onHoverReform?.(lever.id)}
                        onMouseLeave={() => onHoverReform?.(null)}
                        className={`group w-full flex flex-col text-left p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden ${isSelected ? 'border-violet-500 ring-1 ring-violet-500 bg-violet-50/30' : 'border-gray-200 hover:border-violet-300'
                            }`}
                    >
                        {isSelected && (
                            <div className="absolute top-2 right-2 text-violet-600">
                                <span className="material-icons text-base">check_circle</span>
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-1 gap-2 pr-6">
                            <h3 className={`font-bold text-sm transition-colors flex-1 ${isSelected ? 'text-violet-900' : 'text-slate-800 group-hover:text-violet-700'
                                }`}>
                                {lever.label}
                            </h3>
                        </div>

                        <span className={`inline-flex self-start px-2 py-0.5 rounded text-[10px] font-bold mb-2 ${(lever.fixedImpactEur || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {(lever.fixedImpactEur || 0) > 0 ? '+' : ''}{((lever.fixedImpactEur || 0) / 1e9).toFixed(1)} Md€
                        </span>

                        <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                            {lever.description || "Pas de description disponible."}
                        </p>

                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 w-full mt-2">
                            {lever.impact ? (
                                <>
                                    <div className="flex flex-wrap gap-2">
                                        {/* GDP Impact */}
                                        {lever.impact.gdpImpactPct !== undefined && lever.impact.gdpImpactPct !== 0 && (
                                            <ImpactBadge type="gdp" value={lever.impact.gdpImpactPct} />
                                        )}
                                        {/* Jobs Impact */}
                                        {lever.impact.jobsImpactCount !== undefined && lever.impact.jobsImpactCount !== 0 && (
                                            <ImpactBadge type="jobs" value={lever.impact.jobsImpactCount} />
                                        )}
                                        {/* Households Impact */}
                                        {lever.impact.householdsImpacted !== undefined && lever.impact.householdsImpacted > 0 && (
                                            <ImpactBadge type="households" value={lever.impact.householdsImpacted} />
                                        )}
                                    </div>
                                    
                                    {/* Distribution Chart */}
                                    {(lever.impact.decile1ImpactEur !== undefined || lever.impact.decile10ImpactEur !== undefined) && (
                                        <DistributionChart
                                            d1={lever.impact.decile1ImpactEur || 0}
                                            d10={lever.impact.decile10ImpactEur || 0}
                                        />
                                    )}
                                </>
                            ) : (
                                <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded-md flex items-center gap-1 self-start">
                                    <span className="material-icons text-[10px]">hourglass_empty</span>
                                    Impact en cours d'analyse
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
