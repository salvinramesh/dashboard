import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { systemsAPI } from '../utils/api';
import { Play, Square, RotateCw, Search, ServerCog } from 'lucide-react';
import { RestrictedActionModal } from './RestrictedActionModal';

export const Services = ({ system, onNavigate, user }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [showRestrictedModal, setShowRestrictedModal] = useState(false);

    useEffect(() => {
        if (system) {
            loadServices();
        }
    }, [system]);

    const loadServices = async () => {
        try {
            setLoading(true);
            const result = await systemsAPI.getServices(system.id);
            setServices(result);
            setError(null);
        } catch (err) {
            console.error('Failed to load services:', err);
            setError('Failed to load services');
        } finally {
            setLoading(false);
        }
    };

    const handleServiceAction = async (name, action) => {
        if (user?.role !== 'admin') {
            setShowRestrictedModal(true);
            return;
        }

        try {
            setActionLoading(name);
            await systemsAPI.controlService(system.id, name, action);
            // Reload services to update status
            await loadServices();
        } catch (err) {
            console.error(`Failed to ${action} service:`, err);
            alert(`Failed to ${action} service: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.displayName && s.displayName.toLowerCase().includes(search.toLowerCase()))
    );

    if (!system) return null;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage="services" onNavigate={onNavigate} user={user} />
            <RestrictedActionModal isOpen={showRestrictedModal} onClose={() => setShowRestrictedModal(false)} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-7xl mx-auto">
                    <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                                <ServerCog className="text-orange-500" /> System Services
                            </h1>
                            <p className="text-zinc-500">Manage system services for {system.name}</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search services..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-64"
                            />
                        </div>
                    </header>

                    {loading ? (
                        <div className="animate-pulse text-zinc-500">Loading services...</div>
                    ) : error ? (
                        <div className="text-red-500">{error}</div>
                    ) : (
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-900 text-zinc-500 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Description</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {filteredServices.slice(0, 100).map((service) => (
                                        <tr key={service.name} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="p-4 font-mono text-white">{service.name}</td>
                                            <td className="p-4 text-zinc-400 truncate max-w-md">{service.displayName || '-'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${service.status === 'running' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-500'
                                                    }`}>
                                                    {service.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                {actionLoading === service.name ? (
                                                    <span className="animate-spin text-zinc-500"><RotateCw size={18} /></span>
                                                ) : (
                                                    <>
                                                        {service.status !== 'running' && (
                                                            <button
                                                                onClick={() => handleServiceAction(service.name, 'start')}
                                                                className="text-green-500 hover:bg-green-500/10 p-1 rounded"
                                                                title="Start"
                                                            >
                                                                <Play size={18} />
                                                            </button>
                                                        )}
                                                        {service.status === 'running' && (
                                                            <button
                                                                onClick={() => handleServiceAction(service.name, 'stop')}
                                                                className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                                                                title="Stop"
                                                            >
                                                                <Square size={18} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleServiceAction(service.name, 'restart')}
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
                                    {filteredServices.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-zinc-500">No services found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {filteredServices.length > 100 && (
                                <div className="p-4 text-center text-zinc-500 text-xs border-t border-zinc-800">
                                    Showing first 100 of {filteredServices.length} services
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
