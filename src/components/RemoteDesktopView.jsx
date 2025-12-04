import React from 'react';
import { Sidebar } from './Sidebar';
import RemoteDesktop from './RemoteDesktop';

export const RemoteDesktopView = ({ system, onNavigate, user }) => {
    if (!system) return null;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage="remote-desktop" onNavigate={onNavigate} user={user} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-7xl mx-auto">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Remote Desktop</h1>
                        <p className="text-zinc-500">View and monitor {system.name}'s screen in real-time</p>
                    </header>

                    <RemoteDesktop systemId={system.id} />
                </main>
            </div>
        </div>
    );
};
