import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { systemsAPI } from '../utils/api';
import { Shield, Users, Network } from 'lucide-react';

export const Security = ({ system, onNavigate }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (system) {
            loadSecurity();
            const interval = setInterval(loadSecurity, 5000);
            return () => clearInterval(interval);
        }
    }, [system]);

    const loadSecurity = async () => {
        try {
            const result = await systemsAPI.getSecurity(system.apiUrl);
            setData(result);
            setError(null);
        } catch (err) {
            console.error('Failed to load security info:', err);
            setError('Failed to load security info');
        } finally {
            setLoading(false);
        }
    };

    if (!system) return null;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage="security" onNavigate={onNavigate} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-7xl mx-auto">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Security Overview</h1>
                        <p className="text-zinc-500">Network connections and user activity for {system.name}</p>
                    </header>

                    {loading && !data ? (
                        <div className="animate-pulse text-zinc-500">Loading security data...</div>
                    ) : error ? (
                        <div className="text-red-500">{error}</div>
                    ) : (
                        <div className="space-y-8">
                            {/* Active Users */}
                            <section>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Users className="text-green-500" /> Logged-in Users
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {data.users && data.users.length > 0 ? (
                                        data.users.map((user, i) => (
                                            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                                                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 font-bold">
                                                    {user.user.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{user.user}</p>
                                                    <p className="text-xs text-zinc-500">{user.tty} • {user.ip || 'Local'}</p>
                                                    <p className="text-xs text-zinc-600 mt-1">{user.date} {user.time}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full p-8 text-center text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                                            No active users found
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Network Connections */}
                            <section>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Network className="text-blue-500" /> Active Network Connections
                                </h2>
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-zinc-900 text-zinc-500 uppercase font-bold text-xs">
                                            <tr>
                                                <th className="p-4">Protocol</th>
                                                <th className="p-4">Local Address</th>
                                                <th className="p-4">Remote Address</th>
                                                <th className="p-4">State</th>
                                                <th className="p-4">Process</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {data.connections.map((conn, i) => (
                                                <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                                                    <td className="p-4 font-mono text-zinc-400 uppercase">{conn.protocol}</td>
                                                    <td className="p-4 font-mono text-white">{conn.localAddress}:{conn.localPort}</td>
                                                    <td className="p-4 font-mono text-zinc-500">{conn.peerAddress}:{conn.peerPort}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${conn.state === 'LISTEN' ? 'bg-blue-500/10 text-blue-500' :
                                                                conn.state === 'ESTABLISHED' ? 'bg-green-500/10 text-green-500' :
                                                                    'bg-zinc-800 text-zinc-500'
                                                            }`}>
                                                            {conn.state}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-zinc-400">{conn.process || '-'}</td>
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
