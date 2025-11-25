import React, { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, TrendingUp, AlertCircle } from 'lucide-react';
import { colorThemes } from '../config/systems';

export const SystemTile = ({ system, onClick }) => {
    const [stats, setStats] = useState(null);
    const [status, setStatus] = useState('checking'); // 'online', 'offline', 'checking'
    const theme = colorThemes[system.color] || colorThemes.blue;

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${system.apiUrl}/api/stats`, {
                    signal: AbortSignal.timeout(15000)
                });
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                    setStatus('online');
                } else {
                    setStatus('offline');
                }
            } catch (error) {
                setStatus('offline');
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [system.apiUrl]);

    return (
        <div
            onClick={() => status === 'online' && onClick(system)}
            className={`
                relative group
                bg-zinc-900/40 backdrop-blur-xl 
                border ${status === 'online' ? theme.border : 'border-zinc-800'} 
                rounded-3xl p-6 
                shadow-xl shadow-black/20
                hover:border-white/10 transition-all duration-300
                ${status === 'online' ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-60'}
            `}
        >
            {/* Status Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${status === 'online' ? 'bg-green-500 animate-pulse' :
                    status === 'offline' ? 'bg-red-500' :
                        'bg-yellow-500 animate-pulse'
                    }`}></div>
                <span className="text-xs text-zinc-500 uppercase font-bold">
                    {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Checking...'}
                </span>
            </div>

            {/* System Icon & Name */}
            <div className="mb-6">
                <div className={`w-16 h-16 ${theme.light} rounded-2xl flex items-center justify-center mb-4 text-4xl`}>
                    {system.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{system.name}</h3>
                <p className="text-zinc-500 text-sm">{system.description}</p>
            </div>

            {/* Quick Stats */}
            {status === 'online' && stats ? (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-900/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Cpu size={14} className="text-zinc-500" />
                            <span className="text-xs text-zinc-500 font-bold uppercase">CPU</span>
                        </div>
                        <p className="text-lg font-mono text-white">
                            {(typeof stats.cpu === 'object' ? stats.cpu.load : stats.cpu).toFixed(0)}<span className="text-xs text-zinc-600">%</span>
                        </p>
                    </div>
                    <div className="bg-zinc-900/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <HardDrive size={14} className="text-zinc-500" />
                            <span className="text-xs text-zinc-500 font-bold uppercase">RAM</span>
                        </div>
                        <p className="text-lg font-mono text-white">
                            {Math.round((stats.mem.used / stats.mem.total) * 100)}<span className="text-xs text-zinc-600">%</span>
                        </p>
                    </div>
                    <div className="bg-zinc-900/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={14} className="text-zinc-500" />
                            <span className="text-xs text-zinc-500 font-bold uppercase">UP</span>
                        </div>
                        <p className="text-lg font-mono text-white">
                            {(stats.uptime / 3600).toFixed(0)}<span className="text-xs text-zinc-600">h</span>
                        </p>
                    </div>
                </div>
            ) : status === 'offline' ? (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle size={16} />
                    <span>Unable to connect to system</span>
                </div>
            ) : (
                <div className="h-20 flex items-center justify-center">
                    <div className="animate-pulse text-zinc-600">Loading...</div>
                </div>
            )}

            {/* Hover Effect */}
            {status === 'online' && (
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/0 transition-all duration-300 pointer-events-none"></div>
            )}
        </div>
    );
};
