import type { PolicyLever } from '../types';
import { ImpactBadge } from '@/components/reform/ImpactBadge';
import { DistributionChart } from '@/components/reform/DistributionChart';
import { Users, AlertTriangle } from 'lucide-react'; // Retain or add needed icons if any


interface ReformCatalogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectReform: (reform: PolicyLever) => void;
    levers: PolicyLever[];
    onHoverReform?: (reformId: string | null) => void;
}

export function ReformCatalogModal({ isOpen, onClose, onSelectReform, levers, onHoverReform }: ReformCatalogModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-['Outfit']">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-white">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-icons text-violet-600">auto_fix_high</span>
                        Catalogue des Réformes
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="grid gap-3">
                        {levers.length === 0 && (
                            <div className="text-center py-12 text-gray-500 italic">
                                Aucune réforme disponible pour ce contexte.
                            </div>
                        )}

                        {levers.map((lever) => (
                            <button
                                key={lever.id}
                                onClick={() => { onSelectReform(lever); }}
                                onMouseEnter={() => onHoverReform?.(lever.id)}
                                onMouseLeave={() => onHoverReform?.(null)}
                                className="group flex flex-col text-left p-4 bg-white border border-gray-200 hover:border-violet-300 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex justify-between items-start mb-1 gap-4">
                                    <h3 className="font-bold text-slate-800 group-hover:text-violet-700 transition-colors flex-1">{lever.label}</h3>
                                    <span className={`shrink-0 px-2 py-1 rounded text-xs font-bold ${(lever.fixedImpactEur || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {(lever.fixedImpactEur || 0) > 0 ? '+' : ''}{((lever.fixedImpactEur || 0) / 1e9).toFixed(1)} Md€
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{lever.description || "Pas de description disponible."}</p>

                                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 w-full mt-auto">
                                    {lever.impact ? (
                                        <div className="w-full grid gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
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
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 w-full justify-center">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            <span>Impact non modélisé</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-xs text-center text-gray-400">
                    Sélectionner une réforme pour l'ajouter à votre plan budgétaire.
                </div>
            </div>
        </div>
    );
}
