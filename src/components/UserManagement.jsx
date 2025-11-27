import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Users, Trash2, Plus, AlertCircle, CheckCircle2, X } from 'lucide-react';

const UserManagement = ({ currentPage, onNavigate, showSystemLinks = true }) => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'std' });
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const url = editingId ? `/api/users/${editingId}` : '/api/users';
            const method = editingId ? 'PUT' : 'POST';

            const body = { ...formData };
            if (!body.password && editingId) delete body.password; // Don't send empty password on edit

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to ${editingId ? 'update' : 'create'} user`);
            }

            setSuccess(`User ${data.username} ${editingId ? 'updated' : 'created'} successfully`);
            setFormData({ username: '', password: '', role: 'std' });
            setEditingId(null);
            setIsModalOpen(false);
            fetchUsers();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (user) => {
        setFormData({ username: user.username, password: '', role: user.role || 'std' });
        setEditingId(user.id);
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const cancelEdit = () => {
        setFormData({ username: '', password: '', role: 'std' });
        setEditingId(null);
        setError('');
        setSuccess('');
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete user');
            }

            fetchUsers();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage={currentPage} onNavigate={onNavigate} showSystemLinks={showSystemLinks} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-6xl mx-auto">
                    {/* Header */}
                    <header className="mb-12">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
                                <Users className="text-blue-400" size={24} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-white tracking-tight">User Management</h1>
                                <p className="text-zinc-500 text-sm mt-1">Manage dashboard access and permissions</p>
                            </div>
                        </div>
                    </header>

                    {/* Actions Bar */}
                    {currentUser.role === 'admin' && (
                        <div className="mb-8 flex justify-end">
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setFormData({ username: '', password: '', role: 'std' });
                                    setIsModalOpen(true);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Add New User
                            </button>
                        </div>
                    )}

                    {/* Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    {editingId ? <Users size={20} className="text-blue-400" /> : <Plus size={20} className="text-blue-400" />}
                                    {editingId ? 'Edit User' : 'Add New User'}
                                </h2>

                                {error && (
                                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                        <AlertCircle size={20} />
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Username</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                            placeholder="Enter username"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                            {editingId ? 'New Password (leave blank to keep)' : 'Password'}
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                            placeholder={editingId ? "Enter new password" : "Enter password"}
                                            required={!editingId}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        >
                                            <option value="std">Standard</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update User' : 'Add User')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Users List */}
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-zinc-800">
                            <h2 className="text-xl font-bold text-white">Registered Users ({users.length})</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-zinc-900/50 text-zinc-400 text-sm uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Username</th>
                                        <th className="px-6 py-4 font-medium">Role</th>
                                        <th className="px-6 py-4 font-medium">Created At</th>
                                        {currentUser.role === 'admin' && <th className="px-6 py-4 font-medium text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-6 py-4 text-white font-medium">
                                                <div className="flex items-center gap-2">
                                                    {user.username}
                                                    {user.id === currentUser.id && (
                                                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                                    {user.role === 'admin' ? 'Admin' : 'Standard'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-400">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            {currentUser.role === 'admin' && (
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => startEdit(user)}
                                                        className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title="Edit User"
                                                    >
                                                        <Users size={18} />
                                                    </button>
                                                    {user.id !== currentUser.id && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-zinc-500">
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UserManagement;
