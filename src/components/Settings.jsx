import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { colorThemes } from '../config/systems';
import { systemsAPI, generateId } from '../utils/api';
import { isHexColor } from '../utils/colors';
import {
    Settings as SettingsIcon, Plus, Edit2, Trash2, Save, X, LogOut, Bell, BellOff, Search, ChevronDown, Check, Download
} from 'lucide-react';
import { iconMap, getIcon } from '../utils/icons';

export const Settings = ({ onBack, currentPage, onNavigate, showSystemLinks = true, onLogout }) => {
    const [systems, setSystems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSystem, setEditingSystem] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        apiUrl: '',
        color: 'blue',
        icon: 'Server'
    });
    const [installPrompt, setInstallPrompt] = useState(null);
    const [pendingAgents, setPendingAgents] = useState([]);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Fetch systems and pending agents on mount
    useEffect(() => {
        loadSystems();
        loadPendingAgents();

        // Poll for pending agents every 10s
        const interval = setInterval(loadPendingAgents, 10000);

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            window.deferredPrompt = e;
            setInstallPrompt(e); // Trigger re-render
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            clearInterval(interval);
        };
    }, []);

    const loadSystems = async () => {
        try {
            setLoading(true);
            const data = await systemsAPI.getAll();
            setSystems(data);
        } catch (error) {
            console.error('Failed to load systems:', error);
            // alert('Failed to load systems from database');
        } finally {
            setLoading(false);
        }
    };

    const loadPendingAgents = async () => {
        try {
            const data = await systemsAPI.getPending();
            setPendingAgents(data);
        } catch (error) {
            console.error('Failed to load pending agents:', error);
        }
    };

    const colorOptions = Object.keys(colorThemes);
    const iconOptions = Object.keys(iconMap);

    const renderIcon = getIcon;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddNew = (prefillId = null) => {
        // Check if prefillId is an event object (from default onClick)
        const isEvent = prefillId && prefillId.preventDefault;
        const idToUse = isEvent ? '' : (prefillId || '');

        setFormData({
            id: idToUse,
            name: idToUse ? `New Agent ${idToUse.substring(0, 6)}...` : '',
            description: '',
            apiUrl: '',
            color: 'blue',
            icon: 'Server'
        });
        setEditingSystem(null);
        setShowForm(true);
    };

    const handleEdit = (system) => {
        setFormData({
            ...system,
            apiUrl: system.api_url || system.apiUrl
        });
        setEditingSystem(system.id);
        setShowForm(true);
    };

    const handleDeleteClick = (id, e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (deleteConfirmId) {
            try {
                await systemsAPI.delete(deleteConfirmId);
                await loadSystems(); // Reload from database
                setDeleteConfirmId(null);
            } catch (error) {
                console.error('Failed to delete system:', error);
                alert('Failed to delete system: ' + error.message);
            }
        }
    };

    const cancelDelete = () => {
        setDeleteConfirmId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name) {
            alert('Name is required');
            return;
        }

        // URL validation (only if provided)
        if (formData.apiUrl) {
            try {
                new URL(formData.apiUrl);
            } catch {
                alert('Please enter a valid URL');
                return;
            }
        }

        try {
            if (editingSystem) {
                // Update existing
                await systemsAPI.update(editingSystem, {
                    name: formData.name,
                    description: formData.description,
                    apiUrl: formData.apiUrl, // Allow empty string
                    color: formData.color,
                    icon: formData.icon
                });
            } else {
                // Add new
                await systemsAPI.create({
                    id: formData.id || generateId(),
                    name: formData.name,
                    description: formData.description,
                    apiUrl: formData.apiUrl, // Allow empty string
                    color: formData.color,
                    icon: formData.icon
                });
            }

            await loadSystems(); // Reload from database
            setShowForm(false);
            setEditingSystem(null);
        } catch (error) {
            console.error('Failed to save system:', error);
            alert('Failed to save system: ' + error.message);
        }
    };

    const handleToggleNotifications = async (system) => {
        try {
            await systemsAPI.update(system.id, {
                ...system,
                notificationsEnabled: !system.notifications_enabled
            });
            await loadSystems();
        } catch (error) {
            console.error('Failed to toggle notifications:', error);
            alert('Failed to toggle notifications');
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingSystem(null);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage={currentPage} onNavigate={onNavigate} showSystemLinks={showSystemLinks} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-6xl mx-auto">
                    {/* Back Button */}
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="mb-6 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Back to Overview</span>
                        </button>
                    )}

                    {/* Header */}
                    <header className="mb-12">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
                                    <SettingsIcon className="text-blue-400" size={24} />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold text-white tracking-tight">System Settings</h1>
                                    <p className="text-zinc-500 text-sm mt-1">Manage your monitored systems</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {window.deferredPrompt && (
                                    <button
                                        onClick={async () => {
                                            const promptEvent = window.deferredPrompt;
                                            if (!promptEvent) return;
                                            promptEvent.prompt();
                                            const { outcome } = await promptEvent.userChoice;
                                            if (outcome === 'accepted') {
                                                window.deferredPrompt = null;
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors border border-zinc-700"
                                    >
                                        <Download size={20} />
                                        Install App
                                    </button>
                                )}
                                {currentUser.role === 'admin' && (
                                    <button
                                        onClick={handleAddNew}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        <Plus size={20} />
                                        Add System
                                    </button>
                                )}
                                {onLogout && (
                                    <button
                                        onClick={onLogout}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl font-medium transition-colors border border-red-600/20"
                                    >
                                        <LogOut size={20} />
                                        Logout
                                    </button>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Pending/Discovered Agents */}
                    {pendingAgents.length > 0 && currentUser.role === 'admin' && (
                        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-2 mb-4 text-amber-500">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <Bell size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Discovered Agents ({pendingAgents.length})</h2>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {pendingAgents.map(agent => (
                                    <div
                                        key={agent.id}
                                        className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-center justify-between hover:border-amber-500/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                                                <SettingsIcon size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">Unregistered Agent</h3>
                                                <p className="text-sm text-zinc-400 font-mono">{agent.id}</p>
                                                <p className="text-xs text-zinc-500 mt-0.5">IP: {agent.ip}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddNew(agent.id)}
                                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                                        >
                                            <Plus size={18} />
                                            Add to Dashboard
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Form Modal */}
                    {showForm && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                                <h2 className="text-2xl font-bold text-white mb-6">
                                    {editingSystem ? 'Edit System' : 'Add New System'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">System Name *</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                                placeholder="e.g., Production Server"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">API URL (Optional)</label>
                                            <input
                                                type="url"
                                                name="apiUrl"
                                                value={formData.apiUrl}
                                                onChange={handleInputChange}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                                                placeholder="http://192.168.1.100:3001"
                                            />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">System ID (Optional)</label>
                                            <input
                                                type="text"
                                                name="id"
                                                value={formData.id}
                                                onChange={handleInputChange}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                                                placeholder="Leave empty to generate automatically, or paste Agent ID"
                                                disabled={!!editingSystem}
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {editingSystem ? "ID cannot be changed after creation." : "Paste the AGENT_ID from the agent's .env file here to link them."}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                                        <input
                                            type="text"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                            placeholder="e.g., Main production server"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">Color Theme</label>
                                            <div className="grid grid-cols-5 gap-3">
                                                {colorOptions.map(color => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                                                        className={`
                                                            h-12 rounded-xl transition-all duration-200 flex items-center justify-center
                                                            ${colorThemes[color].primary}
                                                            ${formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-105' : 'hover:scale-105 opacity-70 hover:opacity-100'}
                                                        `}
                                                        title={color.charAt(0).toUpperCase() + color.slice(1)}
                                                    >
                                                        {formData.color === color && <Check size={20} className="text-white" />}
                                                    </button>
                                                ))}

                                                {/* Custom Color Picker */}
                                                <div className="relative">
                                                    <input
                                                        type="color"
                                                        value={isHexColor(formData.color) ? formData.color : '#3b82f6'}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        className={`
                                                            w-full h-12 rounded-xl transition-all duration-200 flex items-center justify-center
                                                            bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500
                                                            ${isHexColor(formData.color) ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-105' : 'hover:scale-105 opacity-70 hover:opacity-100'}
                                                        `}
                                                        title="Custom Color"
                                                    >
                                                        {isHexColor(formData.color) ? (
                                                            <div className="w-6 h-6 rounded-full border-2 border-white" style={{ backgroundColor: formData.color }}></div>
                                                        ) : (
                                                            <Plus size={20} className="text-white" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">Icon</label>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-blue-400">
                                                    {renderIcon(formData.icon)}
                                                </div>
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowIconPicker(!showIconPicker)}
                                                        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20"
                                                        title="Select Icon"
                                                    >
                                                        <Plus size={24} />
                                                    </button>

                                                    {showIconPicker && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl z-50 grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                            {iconOptions.map((icon, index) => (
                                                                <button
                                                                    key={`${icon}-${index}`}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({ ...prev, icon }));
                                                                        setShowIconPicker(false);
                                                                    }}
                                                                    className={`
                                                                        w-10 h-10 rounded-lg flex items-center justify-center text-2xl
                                                                        ${formData.icon === icon ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-zinc-800 hover:bg-zinc-700'}
                                                                        transition-all duration-200 hover:scale-105
                                                                    `}
                                                                >
                                                                    {renderIcon(icon)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-4 justify-end">
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                                        >
                                            <X size={18} />
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                        >
                                            <Save size={18} />
                                            {editingSystem ? 'Update System' : 'Add System'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Systems List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Configured Systems ({systems.length})</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search systems..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors w-64"
                                />
                            </div>
                        </div>
                        {systems
                            .filter(system =>
                                (system.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                                (system.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                                (system.api_url?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                            )
                            .map(system => (
                                <div
                                    key={system.id}
                                    className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 flex items-center justify-between hover:border-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 ${colorThemes[system.color]?.light || 'bg-blue-500/10'} rounded-xl flex items-center justify-center text-blue-400`}>
                                            {renderIcon(system.icon)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{system.name}</h3>
                                            <p className="text-sm text-zinc-500">{system.description}</p>
                                            <p className="text-xs text-zinc-600 font-mono mt-1">{system.api_url}</p>
                                        </div>
                                    </div>
                                    {currentUser.role === 'admin' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleNotifications(system)}
                                                className={`p-2 rounded-lg transition-colors ${system.notifications_enabled !== false
                                                    ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                                    }`}
                                                title={system.notifications_enabled !== false ? 'Notifications Enabled' : 'Notifications Disabled'}
                                            >
                                                {system.notifications_enabled !== false ? <Bell size={18} /> : <BellOff size={18} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(system)}
                                                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteClick(system.id, e)}
                                                className="p-2 bg-zinc-800 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>

                    {/* Delete Confirmation Modal */}
                    {deleteConfirmId && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
                                <h3 className="text-xl font-bold text-white mb-2">Delete System</h3>
                                <p className="text-zinc-400 mb-6">
                                    Are you sure you want to delete this system? This action cannot be undone.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={cancelDelete}
                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
