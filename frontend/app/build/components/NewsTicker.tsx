
import { useEffect, useState } from 'react';

const MESSAGES = [
    "DIRECT : Les marchés financiers surveillent la note de la France...",
    "POLITIQUE : L'opposition dénonce un « budget d'austérité cachée ».",
    "ÉCONOMIE : La croissance revue à la baisse pour 2026 selon la Banque de France.",
    "SOCIAL : Les syndicats préviennent : « Pas touche aux retraites ».",
    "BRUXELLES : La Commission Européenne attend des « efforts structurels »."
];

export function NewsTicker() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % MESSAGES.length);
        }, 5000); // Change every 5 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-900 border-t border-slate-700 flex items-center px-4 overflow-hidden z-20">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mr-3 animate-pulse">
                EN DIRECT
            </span>
            <div className="flex-1 overflow-hidden relative h-full">
                {MESSAGES.map((msg, i) => (
                    <div
                        key={i}
                        className={`absolute inset-0 flex items-center transition-all duration-700 ease-in-out ${i === index ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                            }`}
                    >
                        <p className="text-xs text-white font-medium truncate w-full">
                            {msg}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
