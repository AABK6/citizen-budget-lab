
import React from 'react';
import { TrendingUp, TrendingDown, Users, Briefcase, Wallet } from 'lucide-react';

interface ImpactBadgeProps {
    type: 'gdp' | 'jobs' | 'purchasing_power' | 'households';
    value: number;
    label?: string;
    className?: string;
}

export const ImpactBadge: React.FC<ImpactBadgeProps> = ({ type, value, label, className = '' }) => {
    let icon = <TrendingUp className="w-3.5 h-3.5" />;
    let colorClass = 'bg-slate-100 text-slate-800 border-slate-200';
    let formattedValue = '';

    if (type === 'gdp') {
        const isPositive = value > -0.001; // distinct from exactly 0 usually
        icon = isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />;
        colorClass = isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200';
        formattedValue = `${value > 0 ? '+' : ''}${value.toFixed(2)}% PIB`;
    } else if (type === 'jobs') {
        const isPositive = value >= 0;
        icon = <Briefcase className="w-3.5 h-3.5" />;
        colorClass = isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200';
        formattedValue = `${value > 0 ? '+' : ''}${value.toLocaleString()} Emplois`;
    } else if (type === 'purchasing_power') {
        const isPositive = value >= 0;
        icon = <Wallet className="w-3.5 h-3.5" />;
        colorClass = isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200';
        formattedValue = `${value > 0 ? '+' : ''}${Math.round(value)} €`;
    } else if (type === 'households') {
        icon = <Users className="w-3.5 h-3.5" />;
        colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
        // Format millions or thousands
        if (value >= 1000000) {
            formattedValue = `${(value / 1000000).toFixed(1)}M Foyers`;
        } else {
            formattedValue = `${(value / 1000).toFixed(0)}k Foyers`;
        }
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border ${colorClass} ${className}`}>
            {icon}
            <span>{label || formattedValue}</span>
        </div>
    );
};
