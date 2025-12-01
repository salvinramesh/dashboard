import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { systemsAPI } from '../utils/api';
import { Play, Square, RotateCw, Box, Search, Terminal } from 'lucide-react';

export const Docker = ({ system, onNavigate }) => {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        if (system) {
            loadContainers();
            const interval = setInterval(loadContainers, 5000);
            return () => clearInterval(interval);
        }
    }, [system]);

    const loadContainers = async () => {
        try {
            // We use getResources because it returns { processes, docker }
            // If we wanted to optimize, we could make a dedicated endpoint, but this is fine.
            const result = await systemsAPI.getResources(system.id);
            setContainers(result.docker || []);
            setError(null);
        } catch (err) {
            console.error('Failed to load containers:', err);
            setError('Failed to load containers');
        } finally {
            setLoading(false);
        }
    };

    const handleContainerAction = async (containerId, action) => {
        try {
            setActionLoading(containerId);
            await systemsAPI.controlContainer(system.id, containerId, action);
            // Reload to update status
            await loadContainers();
        } catch (err) {
            console.error(`Failed to ${action} container:`, err);
            alert(`Failed to ${action} container: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredContainers = containers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.image.toLowerCase().includes(search.toLowerCase())
    );

    if (!system) return null;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage="docker" onNavigate={onNavigate} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-7xl mx-auto">
                    <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                                <Box className="text-blue-500" /> Docker Containers
                            </h1>
                            <p className="text-zinc-500">Manage Docker containers for {system.name}</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search containers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-64"
                            />
                        </div>
                    </header>

                    {loading && containers.length === 0 ? (
                        <div className="animate-pulse text-zinc-500">Loading containers...</div>
                    ) : error ? (
                        <div className="text-red-500">{error}</div>
                    ) : (
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-900 text-zinc-500 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Image</th>
                                        <th className="p-4">State</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {filteredContainers.map((container) => (
                                        <tr key={container.id} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="p-4 font-mono text-white">{container.name}</td>
                                            <td className="p-4 text-zinc-400">{container.image}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${container.state === 'running' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-500'
                                                    }`}>
                                                    {container.state}
                                                </span>
                                            </td>
                                            <td className="p-4 text-zinc-500">{container.status}</td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                {actionLoading === container.id ? (
                                                    <span className="animate-spin text-zinc-500"><RotateCw size={18} /></span>
                                                ) : (
                                                    <>
                                                        {container.state !== 'running' && (
                                                            <button
                                                                onClick={() => handleContainerAction(container.id, 'start')}
                                                                className="text-green-500 hover:bg-green-500/10 p-1 rounded"
                                                                title="Start"
                                                            >
                                                                <Play size={18} />
                                                            </button>
                                                        )}
                                                        {container.state === 'running' && (
                                                            <button
                                                                onClick={() => handleContainerAction(container.id, 'stop')}
                                                                className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                                                                title="Stop"
                                                            >
                                                                <Square size={18} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleContainerAction(container.id, 'restart')}
                                                            className="text-blue-500 hover:bg-blue-500/10 p-1 rounded"
                                                            title="Restart"
                                                        >
                                                            <RotateCw size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredContainers.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-zinc-500">No containers found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
