import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { systemsAPI } from '../utils/api';
import { ArrowDown, ArrowUp, Activity, Server, AlertCircle, X } from 'lucide-react';

export const NetworkTraffic = ({ onNavigate, showSystemLinks }) => {
    const [systems, setSystems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'rx_sec', direction: 'desc' });

    const fetchSystems = async () => {
        try {
            const data = await systemsAPI.getAll();
            setSystems(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch systems:', err);
            setError('Failed to load network data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSystems();
        const interval = setInterval(fetchSystems, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortedSystems = [...systems].sort((a, b) => {
        const aStats = a.stats?.network?.[0] || { rx_sec: 0, tx_sec: 0, rx_bytes: 0, tx_bytes: 0 };
        const bStats = b.stats?.network?.[0] || { rx_sec: 0, tx_sec: 0, rx_bytes: 0, tx_bytes: 0 };

        let aValue, bValue;

        switch (sortConfig.key) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'rx_sec':
                aValue = aStats.rx_sec;
                bValue = bStats.rx_sec;
                break;
            case 'tx_sec':
                aValue = aStats.tx_sec;
                bValue = bStats.tx_sec;
                break;
            case 'rx_bytes':
                aValue = aStats.rx_bytes;
                bValue = bStats.rx_bytes;
                break;
            case 'tx_bytes':
                aValue = aStats.tx_bytes;
                bValue = bStats.tx_bytes;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSec) => {
        return formatBytes(bytesPerSec) + '/s';
    };

    if (loading && systems.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-500 font-mono animate-pulse">
                LOADING NETWORK DATA...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
            <Sidebar currentPage="network" onNavigate={onNavigate} showSystemLinks={showSystemLinks} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-7xl mx-auto">
                    <header className="mb-12">
                        <h1 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
                            <Activity className="text-blue-500" size={32} />
                            Network Traffic
                        </h1>
                        <p className="text-zinc-400">Real-time network usage across all connected systems.</p>
                    </header>

                    {/* Quick Filters */}
                    <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                        <button
                            onClick={() => setSortConfig({ key: 'rx_sec', direction: 'desc' })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${sortConfig.key === 'rx_sec' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                            Highest Download Speed
                        </button>
                        <button
                            onClick={() => setSortConfig({ key: 'tx_sec', direction: 'desc' })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${sortConfig.key === 'tx_sec' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                            Highest Upload Speed
                        </button>
                        <button
                            onClick={() => setSortConfig({ key: 'rx_bytes', direction: 'desc' })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${sortConfig.key === 'rx_bytes' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                            Most Data Downloaded
                        </button>
                        <button
                            onClick={() => setSortConfig({ key: 'tx_bytes', direction: 'desc' })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${sortConfig.key === 'tx_bytes' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                            Most Data Uploaded
                        </button>

                        {(sortConfig.key !== 'name' || sortConfig.direction !== 'asc') && (
                            <button
                                onClick={() => setSortConfig({ key: 'name', direction: 'asc' })}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                            >
                                <X size={14} />
                                Clear Filter
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-800/50 text-zinc-500 text-xs uppercase tracking-wider">
                                        <th
                                            className="p-6 font-medium cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-2">
                                                System
                                                {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th className="p-6 font-medium">IP Address</th>
                                        <th
                                            className="p-6 font-medium text-right cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('rx_sec')}
                                        >
                                            <div className="flex items-center justify-end gap-2">
                                                Download Speed
                                                {sortConfig.key === 'rx_sec' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th
                                            className="p-6 font-medium text-right cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('tx_sec')}
                                        >
                                            <div className="flex items-center justify-end gap-2">
                                                Upload Speed
                                                {sortConfig.key === 'tx_sec' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th
                                            className="p-6 font-medium text-right cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('rx_bytes')}
                                        >
                                            <div className="flex items-center justify-end gap-2">
                                                Total Downloaded
                                                {sortConfig.key === 'rx_bytes' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th
                                            className="p-6 font-medium text-right cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('tx_bytes')}
                                        >
                                            <div className="flex items-center justify-end gap-2">
                                                Total Uploaded
                                                {sortConfig.key === 'tx_bytes' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {sortedSystems.map((system) => {
                                        const netStats = system.stats?.network?.[0] || { rx_sec: 0, tx_sec: 0, rx_bytes: 0, tx_bytes: 0 };
                                        const isOnline = system.status === 'online';

                                        return (
                                            <tr key={system.id} className="group hover:bg-zinc-800/30 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${system.color || 'blue'}-500/10 text-${system.color || 'blue'}-500`}>
                                                            <Server size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-white">{system.name}</div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                                <span className="text-xs text-zinc-500">{isOnline ? 'Online' : 'Offline'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 font-mono text-sm text-zinc-400">
                                                    {system.api_url?.replace('http://', '').replace(/:\d+$/, '') || 'Unknown'}
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 font-mono text-emerald-400">
                                                        <ArrowDown size={14} />
                                                        {formatSpeed(netStats.rx_sec)}
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 font-mono text-blue-400">
                                                        <ArrowUp size={14} />
                                                        {formatSpeed(netStats.tx_sec)}
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right font-mono text-zinc-300">
                                                    {formatBytes(netStats.rx_bytes)}
                                                </td>
                                                <td className="p-6 text-right font-mono text-zinc-300">
                                                    {formatBytes(netStats.tx_bytes)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
