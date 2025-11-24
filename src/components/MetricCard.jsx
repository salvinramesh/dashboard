import React from 'react';

export const MetricCard = ({ title, children, className = '' }) => {
    return (
        <div className={`
            bg-zinc-900/40 backdrop-blur-xl 
            border border-white/5 
            rounded-3xl p-6 
            shadow-xl shadow-black/20
            hover:border-white/10 transition-colors duration-300
            ${className}
        `}>
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                {title}
            </h3>
            {children}
        </div>
    );
};
