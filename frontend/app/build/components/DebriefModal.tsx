import { ScenarioResult } from '@/lib/types';
import type { DslAction, PolicyLever } from '../types';
import { formatImpactEur, getImpactTone, summarizeScenarioActions } from '../impactUtils';

interface DebriefModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmVote: () => void | Promise<void>;
    isSubmitting?: boolean;
    scenarioResult: ScenarioResult | null;
    deficit: number | null;
    actions: DslAction[];
    policyLevers: PolicyLever[];
    baselineMasses?: Map<string, { name: string; amount: number }>;
    piecesById?: Map<string, { label: string; amount: number; type: 'expenditure' | 'revenue' }>;
    year: number;
}

export function DebriefModal({
    isOpen,
    onClose,
    onConfirmVote,
    isSubmitting = false,
    scenarioResult,
    deficit,
    actions,
    policyLevers,
    baselineMasses,
    piecesById,
    year,
}: DebriefModalProps) {
    if (!isOpen) return null;

    const deficitBillions = deficit ? (deficit / 1e9).toFixed(1) : '0';
    const isDeficitBad = (deficit || 0) < -60e9; // 3% rule approx
    const measures = summarizeScenarioActions({
        actions,
        baselineMasses,
        piecesById,
        policyLevers,
        year,
    });

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto p-4 font-['Outfit'] animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative flex min-h-full items-start justify-center py-4 sm:items-center">
                <div
                    data-testid="debrief-modal-card"
                    className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                >
                    <div className="shrink-0 border-b border-gray-100 bg-slate-50 p-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <span className="material-icons text-3xl">how_to_vote</span>
                        </div>
                        <h2 className="mb-2 text-2xl font-bold text-slate-900">Voter ce Budget ?</h2>
                        <p className="text-sm text-slate-500">
                            Vous vous apprêtez à déposer votre proposition de loi de finances au greffe de la Session Extraordinaire.
                        </p>
                    </div>

                    <div
                        data-testid="debrief-modal-body"
                        className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6"
                    >
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <span className="text-sm font-bold uppercase tracking-wider text-slate-600">Solde Final</span>
                            <div className={`text-2xl font-black ${isDeficitBad ? 'text-red-600' : 'text-emerald-600'}`}>
                                {deficitBillions} Md€
                            </div>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-800">
                            <p className="mb-2 flex items-center gap-2 font-bold">
                                <span className="material-icons text-sm">public</span>
                                Votre voix compte :
                            </p>
                            <ul className="list-disc space-y-1 pl-5 opacity-80">
                                <li>Vos choix seront agrégés anonymement pour faire émerger les préférences réelles des citoyens.</li>
                                <li>Plus les votes seront nombreux, plus ces résultats pèseront sur les décideurs pour sortir de l&apos;impasse.</li>
                                <li>Après le vote, vous pourrez partager votre vision pour donner plus de poids à cette consultation.</li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold uppercase tracking-wider text-slate-700">Mesures retenues</span>
                                <span className="text-xs font-semibold text-slate-400">{measures.length}</span>
                            </div>
                            {measures.length > 0 ? (
                                <div
                                    data-testid="debrief-measures-scroll"
                                    className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70"
                                >
                                    <ul className="divide-y divide-slate-200">
                                        {measures.map((measure) => {
                                            const tone = getImpactTone(measure.impact);
                                            return (
                                                <li key={measure.id} className="flex items-start justify-between gap-3 px-4 py-3">
                                                    <div className="min-w-0 flex items-start gap-2">
                                                        <span className={`mt-1 h-2 w-2 rounded-full ${tone.dot}`} />
                                                        <span className="text-sm font-medium leading-snug text-slate-700">{measure.fullLabel}</span>
                                                    </div>
                                                    <span className={`shrink-0 text-sm font-bold ${tone.text}`}>
                                                        {formatImpactEur(measure.impact)}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                                    Aucune mesure spécifique activée.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-gray-100 bg-gray-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Revoir ma copie
                            </button>
                            <button
                                onClick={onConfirmVote}
                                disabled={isSubmitting}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="material-icons">how_to_vote</span>
                                {isSubmitting ? 'Envoi en cours…' : 'Déposer mon vote'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
