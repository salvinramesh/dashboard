import React from 'react';
import { Server, Cpu, HardDrive, TrendingUp, AlertCircle, TerminalSquare, FileText } from 'lucide-react';
import { getSystemTheme } from '../utils/colors';
import { getIcon } from '../utils/icons';

export const SystemTile = ({ system, onClick, onOpenTerminal, onOpenLogs }) => {
    const { status, stats } = system;
    const theme = getSystemTheme(system.color);

    return (
        <div
            onClick={() => status === 'online' && onClick(system)}
            style={!theme.isLegacy && status === 'online' ? theme.border : {}}
            className={`
                relative group
                bg-zinc-900/40 backdrop-blur-xl 
                border ${status === 'online' ? (theme.isLegacy ? theme.border : '') : 'border-zinc-800'} 
                rounded-3xl p-6 
                shadow-xl shadow-black/20
                hover:border-white/10 transition-all duration-300
                ${status === 'online' ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-60'}
            `}
        >
            {/* Status Indicator & Actions */}
            <div className="absolute top-4 right-4 flex items-center gap-3">
                {status === 'online' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenTerminal && onOpenTerminal();
                        }}
                        className="p-1.5 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
                        title="Open Terminal"
                    >
                        <TerminalSquare size={16} />
                    </button>
                )}
                {status === 'online' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenLogs && onOpenLogs();
                        }}
                        className="p-1.5 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
                        title="View Logs"
                    >
                        <FileText size={16} />
                    </button>
                )}
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${status === 'online' ? 'bg-green-500 animate-pulse' :
                        status === 'offline' ? 'bg-red-500' :
                            'bg-yellow-500 animate-pulse'
                        }`}></div>
                    <span className="text-xs text-zinc-500 uppercase font-bold">
                        {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Checking...'}
                    </span>
                </div>
            </div>

            {/* System Icon & Name */}
            <div className="mb-6">
                <div
                    style={!theme.isLegacy ? theme.light : {}}
                    className={`w-16 h-16 ${theme.isLegacy ? theme.light : ''} rounded-2xl flex items-center justify-center mb-4 text-blue-400`}
                >
                    {getIcon(system.icon)}
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
