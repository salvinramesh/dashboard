import React, { useState, useEffect } from 'react';
import { SystemTile } from './SystemTile';
import { Sidebar } from './Sidebar';
import { systemsAPI } from '../utils/api';
import { LayoutGrid, Search } from 'lucide-react';

export const SystemsOverview = ({ onSelectSystem, currentPage, onNavigate }) => {
    const [systems, setSystems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSystems = systems.filter(system =>
        system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (system.description && system.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (system.api_url && system.api_url.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    useEffect(() => {
        loadSystems();
        const interval = setInterval(loadSystems, 5000);
        return () => clearInterval(interval);
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
            if (loading) setLoading(false);
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
                                    <LayoutGrid className="text-blue-400" size={24} />
                                </div>
                                <h1 className="text-4xl font-bold text-white tracking-tight">
                                    System Overview
                                </h1>
                            </div>

                            {/* Search Bar */}
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search systems..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                        </div>
                        <p className="text-zinc-500 text-lg">
                            Monitor and manage all your connected systems from one centralized dashboard
                        </p>
                    </header>

                    {/* Systems Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSystems.map(system => (
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
