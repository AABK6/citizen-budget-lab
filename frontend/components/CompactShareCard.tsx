import React from 'react';
import { TrendingDown, TrendingUp, ShieldCheck, Zap, Heart, Landmark } from 'lucide-react';

interface CompactShareCardProps {
    deficitInitial: number;
    deficitFinal: number;
    growth: number;
    activeLevers: string[]; // IDs or short labels
}

const LEVER_ICONS: Record<string, any> = {
    'pensions': ShieldCheck,
    'health': Heart,
    'climate': Zap,
    'taxes': Landmark,
    // Add more mappings
};

export const CompactShareCard: React.FC<CompactShareCardProps> = ({
    deficitInitial,
    deficitFinal,
    growth,
    activeLevers
}) => {
    const isImprovement = deficitFinal < deficitInitial;

    return (
        <div className="w-full max-w-4xl bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl flex items-stretch border border-slate-800 font-['Outfit'] h-48">
            {/* 1. BRANDING / IDENTITÉ (Gauche) */}
            <div className="bg-blue-600 p-6 flex flex-col justify-between items-center w-40 text-center">
                <div className="text-2xl font-black leading-tight tracking-tighter">
                    CITIZEN<br/>BUDGET<br/>LAB
                </div>
                <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">
                    Janvier 2026
                </div>
            </div>

            {/* 2. OVERVIEW / CHIFFRES CLÉS (Milieu) */}
            <div className="flex-1 p-6 flex items-center justify-around border-r border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1 tracking-wider">Déficit Public</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-500 line-through text-lg">{deficitInitial}%</span>
                        <span className={`text-4xl font-black ${isImprovement ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {deficitFinal}%
                        </span>
                        {isImprovement ? <TrendingDown className="text-emerald-400 w-6 h-6" /> : <TrendingUp className="text-rose-400 w-6 h-6" />}
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1 tracking-wider">PIB (Projeté)</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-blue-400">+{growth}%</span>
                        <TrendingUp className="text-blue-400 w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* 3. LEVIERS / RÉFORMES (Droite) */}
            <div className="w-1/3 p-6 flex flex-col justify-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-3 tracking-widest">Mesures Phares</p>
                <div className="flex flex-wrap gap-2">
                    {activeLevers.slice(0, 3).map((lever, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs font-medium truncate max-w-[100px]">{lever}</span>
                        </div>
                    ))}
                    {activeLevers.length > 3 && (
                        <div className="text-[10px] text-slate-500 font-bold ml-1">
                            + {activeLevers.length - 3} autres
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
