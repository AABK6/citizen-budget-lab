
import { ScenarioResult } from '@/lib/types';

interface DebriefModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmVote: () => void;
    scenarioResult: ScenarioResult | null;
    deficit: number | null;
}

export function DebriefModal({ isOpen, onClose, onConfirmVote, scenarioResult, deficit }: DebriefModalProps) {
    if (!isOpen) return null;

    const deficitBillions = deficit ? (deficit / 1e9).toFixed(1) : '0';
    const isDeficitBad = (deficit || 0) < -60e9; // 3% rule approx

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-['Outfit'] animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-6 text-center border-b border-gray-100 bg-slate-50">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons text-3xl">how_to_vote</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Voter ce Budget ?</h2>
                    <p className="text-sm text-slate-500">
                        Vous vous apprêtez à déposer votre proposition de loi de finances au greffe de la Session Extraordinaire.
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Solde Final</span>
                        <div className={`text-2xl font-black ${isDeficitBad ? 'text-red-600' : 'text-emerald-600'}`}>
                            {deficitBillions} Md€
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                        <p className="mb-2 font-bold flex items-center gap-2">
                            <span className="material-icons text-sm">public</span>
                            Votre voix compte :
                        </p>
                        <ul className="list-disc pl-5 space-y-1 opacity-80">
                            <li>Vos choix seront agrégés anonymement pour faire émerger les préférences réelles des citoyens.</li>
                            <li>Plus les votes seront nombreux, plus ces résultats pèseront sur les décideurs pour sortir de l&apos;impasse.</li>
                            <li>Après le vote, vous pourrez partager votre vision pour donner plus de poids à cette consultation.</li>
                        </ul>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 text-slate-700 border border-slate-300 rounded-xl font-bold transition-all"
                    >
                        Revoir ma copie
                    </button>
                    <button
                        onClick={onConfirmVote}
                        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-icons">how_to_vote</span>
                        Déposer mon vote
                    </button>
                </div>
            </div>
        </div>
    );
}
