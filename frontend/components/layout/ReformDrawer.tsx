import React, { useState } from 'react';
import type { PolicyLever } from '../../app/build/types';

type ReformDrawerProps = {
    reforms: PolicyLever[];
    isLeverInDsl: (id: string) => boolean;
    onLeverToggle: (lever: PolicyLever) => void;
    formatCurrency: (amount: number) => string;
};

const FAMILY_LABELS: Record<string, string> = {
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

const resolveFamilyLabel = (family?: string) => {
    if (!family) return 'Autres';
    return FAMILY_LABELS[family] || family;
};

export function ReformDrawer({ reforms, isLeverInDsl, onLeverToggle, formatCurrency }: ReformDrawerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFamily, setFilterFamily] = useState<string | 'ALL'>('ALL');

    const families = Array.from(new Set(reforms.map(r => r.family || 'Autres'))).sort();

    const filteredReforms = reforms.filter(reform => {
        const matchesSearch = reform.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (reform.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFamily = filterFamily === 'ALL' || (reform.family || 'Autres') === filterFamily;
        return matchesSearch && matchesFamily;
    });

    return (
        <div className="h-full flex flex-col bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100/50 bg-gradient-to-b from-white/50 to-transparent">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">📚</span>
                    Bibliothèque des réformes
                </h2>
                <p className="text-sm text-gray-500 mt-1">Parcourez et appliquez des réformes structurelles</p>

                {/* Search & Filter */}
                <div className="mt-4 space-y-3">
                    <div className="relative">
                        <i className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</i>
                        <input
                            type="text"
                            placeholder="Rechercher des réformes…"
                            className="w-full pl-9 pr-4 py-2 bg-white/60 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
                        <button
                            className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterFamily === 'ALL'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            onClick={() => setFilterFamily('ALL')}
                        >
                            Toutes
                        </button>
                        {families.map(family => (
                            <button
                                key={family}
                                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterFamily === family
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                onClick={() => setFilterFamily(family)}
                            >
                                {resolveFamilyLabel(family)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredReforms.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>Aucune réforme ne correspond à vos critères.</p>
                    </div>
                ) : (
                    filteredReforms.map((reform) => (
                        <div
                            key={reform.id}
                            className={`group relative p-4 rounded-xl border transition-all duration-200 ${isLeverInDsl(reform.id)
                                ? 'bg-blue-50/90 border-blue-200 shadow-sm ring-1 ring-blue-200'
                                : 'bg-white/60 border-gray-100 hover:border-blue-200 hover:bg-white/90 hover:shadow-md'
                                }`}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                            {resolveFamilyLabel(reform.family)}
                                        </span>
                                        {isLeverInDsl(reform.id) && (
                                            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                                <i className="material-icons text-[10px]">check</i> Appliquée
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 leading-tight">{reform.label}</h3>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2 group-hover:line-clamp-none transition-all">
                                        {reform.description}
                                    </p>

                                    {/* Rich Metadata: Pushbacks */}
                                    {reform.pushbacks && reform.pushbacks.length > 0 && (
                                        <div className="mt-3 bg-orange-50 p-2 rounded-lg border border-orange-100">
                                            <p className="text-xs font-bold text-orange-800 flex items-center gap-1 mb-1">
                                                ⚠️ Points de vigilance
                                            </p>
                                            <ul className="space-y-1">
                                                {reform.pushbacks.map((pb, idx) => (
                                                    <li key={idx} className="text-xs text-orange-700 leading-snug">
                                                        <span className="font-semibold">{pb.type}:</span> {pb.description}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Rich Metadata: Multi-year */}
                                    {reform.multiYearImpact && Object.keys(reform.multiYearImpact).length > 0 && (
                                        <div className="mt-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                            <p className="text-xs font-bold text-blue-800 mb-1">
                                                📈 Trajectoire
                                            </p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {Object.entries(reform.multiYearImpact)
                                                    .sort(([yearA], [yearB]) => Number(yearA) - Number(yearB))
                                                    .map(([year, val]) => (
                                                        <div key={year} className="flex flex-col">
                                                            <span className="text-[10px] text-blue-500 font-medium">{year}</span>
                                                            <span className={`text-xs font-mono font-bold ${val > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {formatCurrency(val)}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={`text-sm font-mono font-bold whitespace-nowrap ${reform.fixedImpactEur && reform.fixedImpactEur > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formatCurrency(reform.fixedImpactEur || 0)}
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                                <button
                                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-all transform active:scale-95 ${isLeverInDsl(reform.id)
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                                        }`}
                                    onClick={() => onLeverToggle(reform)}
                                >
                                    {isLeverInDsl(reform.id) ? 'Retirer la réforme' : 'Ajouter la réforme'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
