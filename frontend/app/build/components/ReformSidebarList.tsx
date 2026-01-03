import { useMemo, useState } from 'react';
import type { PolicyLever } from '../types';
import { ReformDetailDrawer } from './ReformDetailDrawer';

interface ReformSidebarListProps {
    onSelectReform: (reform: PolicyLever) => void;
    levers: PolicyLever[];
    onHoverReform?: (reformId: string | null) => void;
    isLeverSelected: (id: string) => boolean;
    title?: string;
    subtitle?: string;
    side?: 'left' | 'right';
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
    amend_return_exit_tax: { icon: 'flight_takeoff', label: 'Taxe de sortie' },
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
    // Longer truncation for badges
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
    side = 'left',
}: ReformSidebarListProps) {
    // State for the currently viewed reform in the drawer
    const [viewingReform, setViewingReform] = useState<PolicyLever | null>(null);

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
        // Show ALL levers in the list
        return levers;
    }, [levers]);

    const renderLeverCompact = (lever: PolicyLever) => {
        const isSelected = isLeverSelected(lever.id);
        
        // Exact styling from MassCategoryPanel for harmony
        return (
            <div
                key={lever.id}
                onMouseEnter={() => onHoverReform?.(lever.id)}
                onMouseLeave={() => onHoverReform?.(null)}
                className={`group relative p-2 px-3 rounded-lg border transition-all duration-200 cursor-pointer ${isSelected
                    ? 'bg-emerald-50/50 border-emerald-200/50'
                    : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                    }`}
                onClick={(e) => {
                    setViewingReform(lever);
                }}
            >
                <div className="flex justify-between items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-800 truncate">{lever.label}</span>
                            {isSelected && <i className="material-icons text-[10px] text-emerald-600">check_circle</i>}
                        </div>
                        {/* Subtitle/Description as requested */}
                        <div className="text-[10px] text-slate-400 truncate opacity-70 group-hover:opacity-100">
                            {lever.description || lever.shortLabel || "Pas de description"}
                        </div>
                    </div>

                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 ${(lever.fixedImpactEur || 0) > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatImpactShort(lever)}
                    </div>
                </div>
            </div>
        );
    };

    const renderFamilyGroup = (
        entries: ReturnType<typeof groupByFamily>,
        {
            collapsible = true, // Kept for API compat, but ignored for "open all the time" request
            defaultOpen = 'auto',
        }: { collapsible?: boolean; defaultOpen?: boolean | 'auto' } = {},
    ) => (
        <div className="space-y-4">
            {entries.map(([family, items]) => {
                // "Cartes s'ouvrent tout le temps" - forcing open state by using a simple list with header
                return (
                    <div key={family} className="space-y-1">
                        <div className="flex items-center justify-between px-1 py-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <i className="material-icons text-[12px]">{familyIcons[family] || 'label'}</i>
                                {familyLabels[family] || family}
                            </span>
                            <span className="text-[10px] font-medium text-slate-300 bg-slate-50 px-1.5 rounded">{items.length}</span>
                        </div>
                        <div className="space-y-1.5">
                            {items.map(renderLeverCompact)}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const hasResults = levers.length > 0;
    const hasRemaining = remainingLevers.length > 0;
    const featuredCount = featuredLevers.length;

    return (
        <>
            <div className="space-y-4 p-1 animate-in slide-in-from-left-4 duration-300 pb-20">
                <div className="px-2 space-y-1">
                    <div className="text-sm font-semibold text-slate-700 leading-tight">
                        {subtitle || title}
                    </div>
                </div>

                {!hasResults && (
                    <div className="text-center py-8 text-gray-400 text-sm italic">
                        Aucune réforme disponible.
                    </div>
                )}

                {hasResults && featuredCount > 0 && (
                    <div className="px-2">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">À la une</div>
                        <div className="space-y-1">
                            {featuredLevers.map(renderLeverCompact)}
                        </div>
                    </div>
                )}

                {hasResults && (
                    <div className="space-y-3">
                        {hasRemaining ? (
                            renderFamilyGroup(groupByFamily(remainingLevers), { defaultOpen: false })
                        ) : (
                            <div className="px-2 text-xs text-slate-400 italic">
                                Pas d&apos;autres réformes à afficher.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detailed Drawer */}
            <ReformDetailDrawer
                reform={viewingReform}
                onClose={() => setViewingReform(null)}
                // This toggle wrapper ensures we keep the drawer open or close it? 
                // Usually we keep it open, or maybe we close it on toggle? 
                // User said "avant validation", implying validation might close it or just update state.
                // Text says "Ajouter" then it becomes "Retirer". Just toggling is fine.
                onToggle={(r) => onSelectReform(r)}
                isSelected={viewingReform ? isLeverSelected(viewingReform.id) : false}
                side={side}
            />
        </>
    );
}
