import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { getSystems, colorThemes } from '../config/systems';
import { saveSystemsToStorage, generateId, deleteSystem } from '../utils/storage';
import { Settings as SettingsIcon, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export const Settings = ({ onBack }) => {
    const [systems, setSystems] = useState(getSystems());
    const [editingSystem, setEditingSystem] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        apiUrl: '',
        color: 'blue',
        icon: '🖥️'
    });

    const colorOptions = Object.keys(colorThemes);
    const iconOptions = ['🖥️', '💻', '🚀', '⚡', '🔧', '📊', '🌐', '☁️', '🔒', '⚙️'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddNew = () => {
        setFormData({
            id: generateId(),
            name: '',
            description: '',
            apiUrl: '',
            color: 'blue',
            icon: '🖥️'
        });
        setEditingSystem(null);
        setShowForm(true);
    };

    const handleEdit = (system) => {
        setFormData(system);
        setEditingSystem(system.id);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this system?')) {
            deleteSystem(id);
            const updated = getSystems();
            setSystems(updated);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.apiUrl) {
            alert('Name and API URL are required');
            return;
        }

        // URL validation
        try {
            new URL(formData.apiUrl);
        } catch {
            alert('Please enter a valid URL');
            return;
        }

        let updated;
        if (editingSystem) {
            // Update existing
            updated = systems.map(s => s.id === editingSystem ? formData : s);
        } else {
            // Add new
            updated = [...systems, formData];
        }

        saveSystemsToStorage(updated);
        setSystems(updated);
        setShowForm(false);
        setEditingSystem(null);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingSystem(null);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar />

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
                            <button
                                onClick={handleAddNew}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                            >
                                <Plus size={20} />
                                Add System
                            </button>
                        </div>
                    </header>

                    {/* Form Modal */}
                    {showForm && (
                        <div className="mb-8 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
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
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">API URL *</label>
                                        <input
                                            type="url"
                                            name="apiUrl"
                                            value={formData.apiUrl}
                                            onChange={handleInputChange}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                                            placeholder="http://192.168.1.100:3001"
                                            required
                                        />
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
                                        <select
                                            name="color"
                                            value={formData.color}
                                            onChange={handleInputChange}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        >
                                            {colorOptions.map(color => (
                                                <option key={color} value={color} className="capitalize">
                                                    {color}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Icon</label>
                                        <div className="grid grid-cols-10 gap-2">
                                            {iconOptions.map(icon => (
                                                <button
                                                    key={icon}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                                                    className={`
                                                        w-10 h-10 rounded-lg flex items-center justify-center text-2xl
                                                        ${formData.icon === icon ? 'bg-blue-600' : 'bg-zinc-900 hover:bg-zinc-800'}
                                                        transition-colors
                                                    `}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        <Save size={18} />
                                        {editingSystem ? 'Update System' : 'Add System'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        <X size={18} />
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Systems List */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white mb-4">Configured Systems ({systems.length})</h2>
                        {systems.map(system => (
                            <div
                                key={system.id}
                                className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 flex items-center justify-between hover:border-zinc-700 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 ${colorThemes[system.color]?.light || 'bg-blue-500/10'} rounded-xl flex items-center justify-center text-3xl`}>
                                        {system.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{system.name}</h3>
                                        <p className="text-sm text-zinc-500">{system.description}</p>
                                        <p className="text-xs text-zinc-600 font-mono mt-1">{system.apiUrl}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(system)}
                                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(system.id)}
                                        className="p-2 bg-zinc-800 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};
