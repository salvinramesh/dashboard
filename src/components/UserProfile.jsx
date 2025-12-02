import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Shield, ShieldCheck, ShieldAlert, Loader2, Copy, Check } from 'lucide-react';

const UserProfile = ({ currentPage, onNavigate, showSystemLinks = true }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [setupData, setSetupData] = useState(null); // { secret, qrCode }
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [processing, setProcessing] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            }
        } catch (err) {
            console.error('Failed to fetch user', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSetup2FA = async () => {
        setProcessing(true);
        setError('');
        try {
            const response = await fetch('/api/auth/2fa/setup', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setSetupData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleEnable2FA = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setError('');
        try {
            const response = await fetch('/api/auth/2fa/enable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token: verificationCode })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setSuccess('Two-Factor Authentication enabled successfully!');
            setSetupData(null);
            setVerificationCode('');
            fetchUser(); // Refresh user state
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDisable2FA = async (e) => {
        e.preventDefault();
        if (!confirm('Are you sure you want to disable 2FA? This will lower your account security.')) return;

        setProcessing(true);
        setError('');
        try {
            // For disabling, we might ask for a code again for security, but for now let's assume session is enough
            // or we can ask for the current code. The backend endpoint expects a token.
            // Let's ask for a code if the backend requires it.
            // My backend implementation: router.post('/disable', ... const { token } = req.body; ...)
            // Yes, it requires a token.

            const response = await fetch('/api/auth/2fa/disable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token: verificationCode })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setSuccess('Two-Factor Authentication disabled.');
            setVerificationCode('');
            fetchUser();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage={currentPage} onNavigate={onNavigate} showSystemLinks={showSystemLinks} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-4xl mx-auto">
                    <header className="mb-12">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
                                <Shield className="text-blue-400" size={24} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-white tracking-tight">My Profile</h1>
                                <p className="text-zinc-500 text-sm mt-1">Manage your account security</p>
                            </div>
                        </div>
                    </header>

                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <ShieldCheck size={24} className={user?.two_factor_enabled ? "text-green-500" : "text-zinc-600"} />
                            Two-Factor Authentication (2FA)
                        </h2>

                        <div className="mb-8">
                            {user?.two_factor_enabled ? (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400">
                                    <CheckCircle2 size={24} />
                                    <div>
                                        <p className="font-bold">2FA is currently enabled</p>
                                        <p className="text-sm opacity-80">Your account is protected with an extra layer of security.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3 text-yellow-400">
                                    <ShieldAlert size={24} />
                                    <div>
                                        <p className="font-bold">2FA is not enabled</p>
                                        <p className="text-sm opacity-80">We recommend enabling 2FA to secure your account.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                                {success}
                            </div>
                        )}

                        {!user?.two_factor_enabled && !setupData && (
                            <button
                                onClick={handleSetup2FA}
                                disabled={processing}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                            >
                                {processing ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                Setup 2FA
                            </button>
                        )}

                        {setupData && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
                                    <h3 className="font-bold text-white mb-4">1. Scan QR Code</h3>
                                    <div className="flex flex-col md:flex-row gap-6 items-center">
                                        <div className="bg-white p-2 rounded-xl">
                                            <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                        </div>
                                        <div className="space-y-4 flex-1">
                                            <p className="text-zinc-400 text-sm">
                                                Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code.
                                                If you can't scan it, enter the secret key manually:
                                            </p>
                                            <div className="flex items-center gap-2 bg-zinc-900 p-3 rounded-lg border border-zinc-800 font-mono text-sm text-blue-400">
                                                <span className="flex-1 truncate">{setupData.secret}</span>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(setupData.secret)}
                                                    className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-white"
                                                    title="Copy Secret"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
                                    <h3 className="font-bold text-white mb-4">2. Verify Code</h3>
                                    <form onSubmit={handleEnable2FA} className="flex gap-4">
                                        <input
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors w-40 text-center font-mono text-lg tracking-widest"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            disabled={processing || verificationCode.length !== 6}
                                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing ? 'Verifying...' : 'Enable 2FA'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {user?.two_factor_enabled && (
                            <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl mt-6">
                                <h3 className="font-bold text-white mb-4">Disable 2FA</h3>
                                <p className="text-zinc-400 text-sm mb-4">
                                    To disable 2FA, please enter a current code from your authenticator app to confirm it's you.
                                </p>
                                <form onSubmit={handleDisable2FA} className="flex gap-4">
                                    <input
                                        type="text"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors w-40 text-center font-mono text-lg tracking-widest"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={processing || verificationCode.length !== 6}
                                        className="px-6 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/20 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? 'Disabling...' : 'Disable 2FA'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

import { CheckCircle2 } from 'lucide-react'; // Import missing icon

export default UserProfile;
