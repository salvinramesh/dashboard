import React from 'react';

export const MetricCard = ({ title, value, subValue, icon: Icon, trend, color, children, className = '' }) => {
    return (
        <div className={`
            bg-zinc-900/40 backdrop-blur-xl 
            border border-white/5 
            rounded-3xl p-6 
            shadow-xl shadow-black/20
            hover:border-white/10 transition-colors duration-300
            relative overflow-hidden
            ${className}
        `}>
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    {title}
                </h3>
                {Icon && (
                    <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-500`}>
                        <Icon size={18} />
                    </div>
                )}
            </div>

            {value && (
                <div className="mb-4">
                    <div className="text-3xl font-bold text-white tracking-tight mb-1">
                        {value}
                    </div>
                    {subValue && (
                        <div className="text-zinc-500 text-sm font-medium">
                            {subValue}
                        </div>
                    )}
                </div>
            )}

            {children}
        </div>
    );
};
