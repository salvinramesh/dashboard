import React from 'react';
import { SystemTile } from './SystemTile';
import { Sidebar } from './Sidebar';
import { getSystems } from '../config/systems';
import { LayoutGrid } from 'lucide-react';

export const SystemsOverview = ({ onSelectSystem, currentPage, onNavigate }) => {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="mb-12">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
                                <LayoutGrid className="text-blue-400" size={24} />
                            </div>
                            <h1 className="text-4xl font-bold text-white tracking-tight">
                                System Overview
                            </h1>
                        </div>
                        <p className="text-zinc-500 text-lg">
                            Monitor and manage all your connected systems from one centralized dashboard
                        </p>
                    </header>

                    {/* Systems Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {getSystems().map(system => (
                            <SystemTile
                                key={system.id}
                                system={system}
                                onClick={onSelectSystem}
                            />
                        ))}
                    </div>

                    {/* Add System Hint */}
                    <div className="mt-12 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-2">Add More Systems</h3>
                        <p className="text-zinc-500 text-sm mb-4">
                            To monitor additional systems, deploy the backend on each machine and add their configuration to <code className="bg-zinc-800 px-2 py-1 rounded text-blue-400">src/config/systems.js</code>
                        </p>
                        <div className="bg-zinc-950/50 rounded-xl p-4 font-mono text-xs text-zinc-400 overflow-x-auto">
                            <div className="text-green-400 mb-2">// Example configuration:</div>
                            <div>{'{'}</div>
                            <div className="pl-4">id: 'my-server',</div>
                            <div className="pl-4">name: 'My Server',</div>
                            <div className="pl-4">description: 'Production server',</div>
                            <div className="pl-4">apiUrl: 'http://192.168.1.100:3001',</div>
                            <div className="pl-4">color: 'green',</div>
                            <div className="pl-4">icon: '🚀'</div>
                            <div>{'}'}</div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
