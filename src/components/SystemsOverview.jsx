import React, { useState, useEffect } from 'react';
import { SystemTile } from './SystemTile';
import { Sidebar } from './Sidebar';
import { systemsAPI } from '../utils/api';
import { LayoutGrid } from 'lucide-react';

export const SystemsOverview = ({ onSelectSystem, currentPage, onNavigate }) => {
    const [systems, setSystems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadSystems();
    }, []);

    const loadSystems = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await systemsAPI.getAll();
            setSystems(data);
        } catch (error) {
            console.error('Failed to load systems:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex items-center justify-center">
                <div className="text-zinc-500 font-mono animate-pulse">Loading systems...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex items-center justify-center">
                <div className="text-red-500 font-mono text-center">
                    <p className="text-xl mb-2">Failed to load systems</p>
                    <p className="text-sm opacity-70">{error}</p>
                    <button
                        onClick={loadSystems}
                        className="mt-4 px-4 py-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage={currentPage} onNavigate={onNavigate} showSystemLinks={false} />

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
                        {systems.map(system => (
                            <SystemTile
                                key={system.id}
                                system={{
                                    ...system,
                                    apiUrl: system.api_url // Map database field to frontend field
                                }}
                                onClick={onSelectSystem}
                            />
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};
