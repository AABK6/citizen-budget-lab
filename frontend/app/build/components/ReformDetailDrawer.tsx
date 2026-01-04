import { useRef, useEffect } from 'react';
import type { PolicyLever } from '../types';
import { ImpactBadge } from '@/components/reform/ImpactBadge';
import { DistributionChart } from '@/components/reform/DistributionChart';

interface ReformDetailDrawerProps {
    reform: PolicyLever | null;
    onClose: () => void;
    onToggle: (reform: PolicyLever) => void;
    isSelected: boolean;
    side?: 'left' | 'right';
}

const familyLabels: Record<string, string> = {
    TAXES: 'Fiscalité',
    TAX_EXPENDITURES: 'Dépenses fiscales',
    SOCIAL_SECURITY: 'Sécurité sociale',
    PENSIONS: 'Retraites',
    HEALTH: 'Santé',
    STAFFING: 'Fonction publique',
    DEFENSE: 'Défense',
    CLIMATE: 'Transition écologique',
    PROCUREMENT: 'Achats publics',
    OPERATIONS: "Fonctionnement de l'État",
    SUBSIDIES: 'Subventions',
    OTHER: 'Autres',
};

const pushbackTypeLabels: Record<string, { label: string; icon: string }> = {
    financial: { label: 'Risque Financier', icon: 'payments' },
    economic: { label: 'Risque Économique', icon: 'trending_down' },
    social: { label: 'Impact Social', icon: 'groups' },
    legal: { label: 'Contrainte Juridique', icon: 'gavel' },
    political: { label: 'Faisabilité Politique', icon: 'how_to_vote' },
    administrative: { label: 'Mise en œuvre', icon: 'settings' }
};

export function ReformDetailDrawer({ reform, onClose, onToggle, isSelected, side = 'left' }: ReformDetailDrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!reform) return null;

    const impact = reform.fixedImpactEur ?? 0;

    // Calculate position classes based on side
    const positionClass = side === 'left'
        ? 'left-[412px] rounded-2xl'
        : 'right-[382px] rounded-2xl';

    return (
        <div className="fixed inset-0 z-[40] font-['Outfit'] isolate pointer-events-none">
            {/* Minimal Backdrop */}
            <div
                className="absolute inset-0 pointer-events-auto"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                ref={drawerRef}
                className={`fixed top-32 h-fit max-h-[calc(100vh-140px)] w-[340px] bg-white shadow-2xl pointer-events-auto flex flex-col rounded-2xl animate-in slide-in-from-bottom-2 fade-in duration-300 ease-out ring-1 ring-black/5 ${positionClass}`}
            >
                {/* Header */}
                <div className="pt-6 px-5 pb-0 shrink-0 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <span className="material-icons text-lg">close</span>
                    </button>

                    <h2 className="text-xl font-bold text-slate-900 leading-snug pr-8 mb-3 break-words whitespace-normal">
                        {reform.label}
                    </h2>

                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                            {familyLabels[reform.family] || 'Autre'}
                        </span>

                        <div className={`text-sm font-black px-3 py-1 rounded-lg ${impact > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {impact > 0 ? '+' : ''}{(impact / 1e9).toFixed(1)} Md€ <span className="text-xs font-medium opacity-70 ml-1">(2026)</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4 custom-scrollbar">

                    {/* Description */}
                    <div className="text-sm text-slate-600 leading-relaxed text-justify">
                        {reform.description || "Aucune description détaillée disponible pour cette mesure."}
                    </div>

                    {/* Vigilance Points */}
                    {((reform.pushbacks && reform.pushbacks.length > 0) || (reform.vigilancePoints && reform.vigilancePoints.length > 0)) && (
                        <div className="bg-orange-50/60 rounded-xl p-3 border border-orange-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons text-orange-500 text-base">warning</span>
                                <span className="text-xs font-black text-orange-800 uppercase tracking-wide">
                                    Points de vigilance
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {reform.pushbacks?.map((pb, idx) => (
                                    <li key={`pb-${idx}`} className="flex items-start gap-2 text-sm text-slate-700 leading-snug">
                                        <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        <span>{pb.description}</span>
                                    </li>
                                ))}
                                {reform.vigilancePoints?.map((vp, idx) => (
                                    <li key={`vp-${idx}`} className="flex items-start gap-2 text-sm text-slate-700 leading-snug">
                                        <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        <span>{vp}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Authoritative Sources */}
                    {reform.authoritativeSources && reform.authoritativeSources.length > 0 && (
                        <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons text-blue-500 text-base">menu_book</span>
                                <span className="text-xs font-black text-blue-800 uppercase tracking-wide">
                                    Sources faisant autorité
                                </span>
                            </div>
                            <ul className="space-y-1">
                                {reform.authoritativeSources.map((source, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                                        <span className="shrink-0 w-1 h-1 rounded-full bg-blue-400" />
                                        <span>{source}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-3 shrink-0 border-t border-slate-50">
                    <button
                        onClick={() => {
                            onToggle(reform);
                            onClose();
                        }}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs transition-transform active:scale-[0.98] flex items-center justify-center gap-2 ${isSelected
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-violet-600 text-white shadow-lg shadow-violet-200 hover:bg-violet-700'
                            }`}
                    >
                        {isSelected ? (
                            <>
                                <span className="material-icons text-sm">remove_circle_outline</span>
                                Retirer du scénario
                            </>
                        ) : (
                            <>
                                <span className="material-icons text-sm">add_circle_outline</span>
                                Ajouter au scénario
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
