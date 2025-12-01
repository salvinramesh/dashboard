import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { systemsAPI } from '../utils/api';
import { Cpu, Box, Activity, Server, XCircle } from 'lucide-react';

export const Resources = ({ system, onNavigate }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (system) {
            loadResources();
            const interval = setInterval(loadResources, 5000);
            return () => clearInterval(interval);
        }
    }, [system]);

    const loadResources = async () => {
        try {
            const result = await systemsAPI.getResources(system.id);
            setData(result);
            setError(null);
        } catch (err) {
            console.error('Failed to load resources:', err);
            setError('Failed to load resources');
        } finally {
            setLoading(false);
        }
    };

    const handleKillProcess = async (pid, name) => {
        if (!window.confirm(`Are you sure you want to kill process "${name}" (PID: ${pid})?`)) {
            return;
        }

        try {
            await systemsAPI.killProcess(system.id, pid);
            // Optimistically remove from UI or reload
            loadResources();
            alert(`Process ${name} killed successfully.`);
        } catch (err) {
            console.error('Failed to kill process:', err);
            alert(`Failed to kill process: ${err.message}`);
        }
    };

    if (!system) return null;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage="resources" onNavigate={onNavigate} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-7xl mx-auto">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">System Resources</h1>
                        <p className="text-zinc-500">Real-time process and container monitoring for {system.name}</p>
                    </header>

                    {loading && !data ? (
                        <div className="animate-pulse text-zinc-500">Loading resources...</div>
                    ) : error ? (
                        <div className="text-red-500">{error}</div>
                    ) : (
                        <div className="space-y-8">
                            {/* Docker Containers */}
                            <section>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Box className="text-blue-500" /> Docker Containers
                                </h2>
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-zinc-900 text-zinc-500 uppercase font-bold text-xs">
                                            <tr>
                                                <th className="p-4">Name</th>
                                                <th className="p-4">Image</th>
                                                <th className="p-4">State</th>
                                                <th className="p-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {data.docker && data.docker.length > 0 ? (
                                                data.docker.map((container, i) => (
                                                    <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                                                        <td className="p-4 font-mono text-white">{container.name}</td>
                                                        <td className="p-4 text-zinc-400">{container.image}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${container.state === 'running' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-500'
                                                                }`}>
                                                                {container.state}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-zinc-500">{container.status}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="p-8 text-center text-zinc-500">No active containers found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Top Processes */}
                            <section>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Activity className="text-purple-500" /> Top Processes
                                </h2>
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-zinc-900 text-zinc-500 uppercase font-bold text-xs">
                                            <tr>
                                                <th className="p-4">PID</th>
                                                <th className="p-4">Name</th>
                                                <th className="p-4">User</th>
                                                <th className="p-4 text-right">CPU %</th>
                                                <th className="p-4 text-right">Mem %</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {data.processes.map((proc) => (
                                                <tr key={proc.pid} className="hover:bg-zinc-800/50 transition-colors">
                                                    <td className="p-4 font-mono text-zinc-500">{proc.pid}</td>
                                                    <td className="p-4 font-medium text-white">{proc.name}</td>
                                                    <td className="p-4 text-zinc-400">{proc.user}</td>
                                                    <td className="p-4 text-right font-mono text-blue-400">{proc.cpu.toFixed(1)}%</td>
                                                    <td className="p-4 text-right font-mono text-purple-400">{proc.mem.toFixed(1)}%</td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => handleKillProcess(proc.pid, proc.name)}
                                                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors"
                                                            title="Kill Process"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
