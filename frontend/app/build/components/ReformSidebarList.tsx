import { useMemo } from 'react';
import type { PolicyLever } from '../types';
import { ImpactBadge } from '@/components/reform/ImpactBadge';
import { DistributionChart } from '@/components/reform/DistributionChart';

interface ReformSidebarListProps {
    onSelectReform: (reform: PolicyLever) => void;
    levers: PolicyLever[];
    onHoverReform?: (reformId: string | null) => void;
    isLeverSelected: (id: string) => boolean;
    title?: string;
    subtitle?: string;
}

const familyOrder = [
    'TAXES',
    'TAX_EXPENDITURES',
    'SOCIAL_SECURITY',
    'PENSIONS',
    'HEALTH',
    'STAFFING',
    'DEFENSE',
    'CLIMATE',
    'PROCUREMENT',
    'OPERATIONS',
    'SUBSIDIES',
    'OTHER',
];

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

const familyIcons: Record<string, string> = {
    TAXES: 'payments',
    TAX_EXPENDITURES: 'receipt_long',
    SOCIAL_SECURITY: 'health_and_safety',
    PENSIONS: 'elderly',
    HEALTH: 'local_hospital',
    STAFFING: 'badge',
    DEFENSE: 'security',
    CLIMATE: 'eco',
    PROCUREMENT: 'shopping_cart',
    OPERATIONS: 'domain',
    SUBSIDIES: 'handshake',
    OTHER: 'tune',
};

const FEATURED_LIMIT = 10;

const featuredBadgeOverrides: Record<string, { icon: string; label: string }> = {
    amend_ondam_3pct_increase: { icon: 'local_hospital', label: 'ONDAM' },
    amend_no_medical_copay_doubling: { icon: 'medical_services', label: 'Franchises' },
    amend_limit_sick_leave_duration: { icon: 'sick', label: 'Arrets' },
    amend_suspend_retirement_reform: { icon: 'accessibility_new', label: 'Retraites' },
    amend_new_birth_leave: { icon: 'child_friendly', label: 'Naissance' },
    amend_no_benefit_index_freeze: { icon: 'payments', label: 'Indexation' },
    amend_no_new_apprentice_contrib: { icon: 'school', label: 'Apprentis' },
    amend_no_meal_voucher_tax: { icon: 'lunch_dining', label: 'Tickets resto' },
    amend_raise_csg_on_capital: { icon: 'account_balance_wallet', label: 'CSG capital' },
    amend_surtax_health_insurers: { icon: 'health_and_safety', label: 'Mutuelles' },
    amend_extend_overtime_deduction: { icon: 'schedule', label: 'Heures sup' },
    amend_increase_severance_tax: { icon: 'work', label: 'Ruptures' },
    amend_raise_big_corp_profit_contrib: { icon: 'business', label: 'Grands groupes' },
    amend_high_income_surtax_permanent: { icon: 'savings', label: 'Hauts revenus' },
    amend_double_gafam_tax: { icon: 'computer', label: 'GAFAM' },
    amend_raise_buyback_tax: { icon: 'swap_horiz', label: 'Rachats' },
    amend_tighten_pacte_dutreil: { icon: 'family_restroom', label: 'Dutreil' },
    amend_ifi_to_fortune_improductive: { icon: 'real_estate_agent', label: 'Fortune' },
    amend_return_exit_tax: { icon: 'flight_takeoff', label: 'Exit tax' },
    amend_one_time_donation_exemption: { icon: 'card_giftcard', label: 'Dons' },
    amend_home_service_credit_cap: { icon: 'home', label: 'Services' },
    amend_extend_tips_exemption: { icon: 'restaurant', label: 'Pourboires' },
    amend_ir_bracket_indexation_1pct: { icon: 'percent', label: 'Bareme IR' },
    amend_school_fees_tax_reduction: { icon: 'school', label: 'Scolarite' },
    amend_alimony_tax_exemption: { icon: 'child_care', label: 'Pensions alim.' },
    amend_dependence_reduction_to_credit: { icon: 'accessible', label: 'Dependance' },
    amend_limit_holding_tax_to_luxury: { icon: 'workspace_premium', label: 'Luxe' },
    amend_universal_tax_multinationals: { icon: 'public', label: 'Multis' },
    amend_lower_global_min_tax_threshold: { icon: 'trending_down', label: 'IS min' },
    amend_sme_cit_threshold_100k: { icon: 'store', label: 'PME' },
};

const groupByFamily = (items: PolicyLever[]) => {
    const groups = new Map<string, PolicyLever[]>();
    items.forEach((lever) => {
        const key = lever.family || 'OTHER';
        const bucket = groups.get(key) || [];
        bucket.push(lever);
        groups.set(key, bucket);
    });

    const orderIndex = new Map<string, number>(
        familyOrder.map((family, index) => [family, index]),
    );

    return Array.from(groups.entries())
        .map(([family, familyLevers]) => {
            const sorted = [...familyLevers].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
            return [family, sorted] as const;
        })
        .sort(([familyA], [familyB]) => {
            const aRank = orderIndex.get(familyA) ?? 999;
            const bRank = orderIndex.get(familyB) ?? 999;
            return aRank - bRank;
        });
};

const formatImpactShort = (lever: PolicyLever) => {
    const impact = lever.fixedImpactEur ?? 0;
    if (!impact) return "Impact non chiffré";
    const sign = impact > 0 ? '+' : '';
    return `${sign}${(impact / 1e9).toFixed(1)} Md€`;
};

const formatBadgeLabel = (lever: PolicyLever) => {
    const override = featuredBadgeOverrides[lever.id];
    if (override?.label) return override.label;
    if (lever.shortLabel) return lever.shortLabel;
    const label = lever.label;
    return label.length > 22 ? `${label.slice(0, 22)}...` : label;
};

const resolveBadgeIcon = (lever: PolicyLever) =>
    featuredBadgeOverrides[lever.id]?.icon || familyIcons[lever.family] || familyIcons.OTHER;

export function ReformSidebarList({
    onSelectReform,
    levers,
    onHoverReform,
    isLeverSelected,
    title = 'Réformes',
    subtitle = 'Sélectionnez des mesures applicables à votre scénario',
}: ReformSidebarListProps) {
    const featuredLevers = useMemo(() => {
        const majors = levers.filter((lever) => lever.majorAmendment);
        return [...majors]
            .sort((a, b) => {
                const impactA = Math.abs(a.fixedImpactEur ?? 0);
                const impactB = Math.abs(b.fixedImpactEur ?? 0);
                if (impactA !== impactB) return impactB - impactA;
                return a.label.localeCompare(b.label, 'fr');
            })
            .slice(0, FEATURED_LIMIT);
    }, [levers]);

    const remainingLevers = useMemo(() => {
        if (featuredLevers.length === 0) return levers;
        const featuredIds = new Set(featuredLevers.map((lever) => lever.id));
        return levers.filter((lever) => !featuredIds.has(lever.id));
    }, [featuredLevers, levers]);

    const renderLever = (lever: PolicyLever) => {
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
                                {lever.impact.gdpImpactPct !== undefined && lever.impact.gdpImpactPct !== 0 && (
                                    <ImpactBadge type="gdp" value={lever.impact.gdpImpactPct} />
                                )}
                                {lever.impact.jobsImpactCount !== undefined && lever.impact.jobsImpactCount !== 0 && (
                                    <ImpactBadge type="jobs" value={lever.impact.jobsImpactCount} />
                                )}
                                {lever.impact.householdsImpacted !== undefined && lever.impact.householdsImpacted > 0 && (
                                    <ImpactBadge type="households" value={lever.impact.householdsImpacted} />
                                )}
                            </div>
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
    };

    const renderFamilyGroup = (
        entries: ReturnType<typeof groupByFamily>,
    {
        collapsible = true,
        defaultOpen = 'auto',
    }: { collapsible?: boolean; defaultOpen?: boolean | 'auto' } = {},
) => (
    <div className="space-y-4">
        {entries.map(([family, items]) => {
            const header = (
                <div className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>{familyLabels[family] || family}</span>
                    <span className="text-[10px] font-medium text-slate-400">{items.length}</span>
                </div>
            );
            const isOpen = defaultOpen === 'auto' ? items.length <= 4 : defaultOpen;

            if (!collapsible) {
                return (
                    <div key={family} className="space-y-2">
                        {header}
                        <div className="space-y-2">
                            {items.map(renderLever)}
                        </div>
                    </div>
                );
            }

            return (
                <details key={family} open={isOpen} className="group">
                    <summary className="flex items-center justify-between cursor-pointer select-none rounded-lg px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700">
                        <span>{familyLabels[family] || family}</span>
                        <span className="text-[10px] font-medium text-slate-400">{items.length}</span>
                    </summary>
                    <div className="mt-3 space-y-2">
                        {items.map(renderLever)}
                    </div>
                </details>
            );
        })}
    </div>
    );

    const hasResults = levers.length > 0;
    const hasRemaining = remainingLevers.length > 0;
    const featuredCount = featuredLevers.length;

    return (
        <div className="space-y-3 p-1 animate-in slide-in-from-left-4 duration-300">
            <div className="px-2 space-y-1">
                <div className="text-sm font-semibold text-slate-700 leading-tight">
                    {subtitle || title}
                </div>
                {featuredCount > 0 && (
                    <div className="text-[11px] text-slate-400 leading-tight">
                        Réformes principales débattues
                    </div>
                )}
            </div>

            {!hasResults && (
                <div className="text-center py-8 text-gray-400 text-sm italic">
                    Aucune réforme disponible.
                </div>
            )}

            {hasResults && featuredCount > 0 && (
                <div className="px-2">
                    <div className="flex flex-wrap gap-2">
                        {featuredLevers.map((lever) => {
                            const isSelected = isLeverSelected(lever.id);
                            const impact = lever.fixedImpactEur ?? 0;
                            const impactClass = impact > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : impact < 0
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200';
                            return (
                                <button
                                    key={lever.id}
                                    onClick={() => onSelectReform(lever)}
                                    onMouseEnter={() => onHoverReform?.(lever.id)}
                                    onMouseLeave={() => onHoverReform?.(null)}
                                    title={`${lever.label} — ${formatImpactShort(lever)}`}
                                    className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${impactClass} ${isSelected ? 'ring-1 ring-violet-500 border-violet-500' : 'hover:border-slate-300'
                                        }`}
                                >
                                    <span className="material-icons text-[14px]">
                                        {resolveBadgeIcon(lever)}
                                    </span>
                                    <span className="max-w-[90px] truncate">{formatBadgeLabel(lever)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {hasResults && (
                <div className="space-y-3">
                    {hasRemaining ? (
                        renderFamilyGroup(groupByFamily(remainingLevers), { defaultOpen: false })
                    ) : (
                        <div className="px-2 text-xs text-slate-400 italic">
                            Pas d'autres réformes à afficher.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
