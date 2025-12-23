import type { PolicyLever } from '../types';

interface ReformSidebarListProps {
    onClose: () => void;
    onSelectReform: (reform: PolicyLever) => void;
    levers: PolicyLever[];
    onHoverReform?: (reformId: string | null) => void;
    isLeverSelected: (id: string) => boolean;
}

export function ReformSidebarList({ onClose, onSelectReform, levers, onHoverReform, isLeverSelected }: ReformSidebarListProps) {
    return (
        <div className="flex flex-col h-full bg-slate-50/50 animate-in slide-in-from-left-4 duration-300 font-['Outfit']">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-icons text-violet-600 text-lg">auto_fix_high</span>
                    Réformes
                </h2>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    title="Retour aux missions"
                >
                    <span className="material-icons">close</span>
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 w-full">
                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="material-icons text-[10px]">account_balance_wallet</span> --
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="material-icons text-[10px]">trending_up</span> --
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Simple Footer Tip */}
            <div className="p-3 text-[10px] text-center text-slate-400 bg-slate-50 border-t border-slate-100">
                Survolez pour voir l'impact
            </div>
        </div>
    );
}
