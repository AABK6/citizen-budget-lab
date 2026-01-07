import { RevenueFamily } from '../types';

type FamilyActionModalProps = {
  family: RevenueFamily;
  targetPercent: number;
  onConfirm: () => void;
  onCancel: () => void;
  formatCurrency: (val: number) => string;
  totalAmount: number;
};

export function FamilyActionModal({
  family,
  targetPercent,
  onConfirm,
  onCancel,
  formatCurrency,
  totalAmount,
}: FamilyActionModalProps) {
  const deltaAmount = (totalAmount * targetPercent) / 100;
  const isIncrease = deltaAmount > 0;
  
  // Dynamic color based on impact
  const impactColor = isIncrease ? 'text-emerald-600' : 'text-rose-600';
  const bgColor = isIncrease ? 'bg-emerald-50' : 'bg-rose-50';
  const borderColor = isIncrease ? 'border-emerald-100' : 'border-rose-100';

  const decreaseRisks = [
    "Creusement immédiat du déficit public et de la dette.",
    "Moins de ressources pour financer les services publics essentiels (Hôpital, École, Sécurité...).",
    "Risque de dégradation de la crédibilité financière de la France si non compensé."
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${borderColor} ${bgColor} flex items-start gap-4`}>
          <span className="text-3xl bg-white w-12 h-12 flex items-center justify-center rounded-xl shadow-sm">
            {family.icon}
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{family.displayLabel}</h2>
            <div className={`text-lg font-bold ${impactColor} flex items-center gap-2`}>
              {targetPercent > 0 ? '+' : ''}{targetPercent}% 
              <span className="text-sm opacity-70 text-slate-600">
                ({targetPercent > 0 ? '+' : ''}{formatCurrency(deltaAmount)})
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Precise Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description de l'action</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Vous vous apprêtez à <strong>{isIncrease ? 'augmenter' : 'baisser'}</strong> les {family.displayLabel.toLowerCase()} de <strong>{Math.abs(targetPercent)}%</strong>. 
              <br/><br/>
              Cela représente un impact budgétaire annuel de <strong>{formatCurrency(deltaAmount)}</strong> qui sera {isIncrease ? 'ajouté aux' : 'soustrait des'} recettes de l'État.
            </p>
          </div>

          {/* Risks / Vigilance - Conditional */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-3">
              <i className="material-icons text-base">warning</i>
              {isIncrease ? "Risques (Hausse)" : "Risques (Baisse)"}
            </h3>
            <ul className="space-y-2">
              {(isIncrease ? (family.vigilancePoints || []) : decreaseRisks).map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-amber-900/80">
                  <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-slate-400 italic text-center">
            Cette mesure impactera {targetPercent > 0 ? 'à la hausse' : 'à la baisse'} toutes les composantes de cette famille.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
          >
            <i className="material-icons text-sm">check</i>
            Valider l'ajout
          </button>
        </div>
      </div>
    </div>
  );
}
