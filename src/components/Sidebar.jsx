import React from 'react';
import { LayoutDashboard, Server, Settings, Activity, Shield, Users, Network } from 'lucide-react';

export const Sidebar = ({ currentPage, onNavigate, showSystemLinks = true }) => {
    return (
        <div className="w-20 lg:w-64 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col items-center lg:items-start p-4 fixed left-0 top-0 z-50 transition-all duration-300">
            <div className="flex flex-col items-center gap-3 mb-12 px-2">
                <img src="/logo.png" alt="Logo" className="w-16 h-16 lg:w-28 lg:h-28 object-contain" />
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-shine text-center hidden lg:block tracking-widest uppercase">
                        Advanced System Monitor
                    </span>
                </div>
            </div>

            <nav className="flex flex-col gap-2 w-full">
                <NavItem
                    icon={<LayoutDashboard size={20} />}
                    label="Dashboard"
                    active={currentPage === 'overview' || currentPage === 'detail'}
                    onClick={() => onNavigate?.('overview')}
                />
                {showSystemLinks && (
                    <>
                        <NavItem
                            icon={<Server size={20} />}
                            label="Resources"
                            active={currentPage === 'resources'}
                            onClick={() => onNavigate?.('resources')}
                        />
                        <NavItem
                            icon={<Shield size={20} />}
                            label="Security"
                            active={currentPage === 'security'}
                            onClick={() => onNavigate?.('security')}
                        />
                    </>
                )}
                <NavItem
                    icon={<Network size={20} />}
                    label="Network"
                    active={currentPage === 'network'}
                    onClick={() => onNavigate?.('network')}
                />
                <NavItem
                    icon={<Users size={20} />}
                    label="Users"
                    active={currentPage === 'users'}
                    onClick={() => onNavigate?.('users')}
                />
                <NavItem
                    icon={<Settings size={20} />}
                    label="Settings"
                    active={currentPage === 'settings'}
                    onClick={() => onNavigate?.('settings')}
                />
            </nav>

            <div className="mt-auto w-full px-2 hidden lg:block">
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-2">System Status</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-zinc-300">Operational</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
                ${active
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}
            `}
        >
            <span className={`${active ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                {icon}
            </span>
            <span className="hidden lg:block font-medium text-sm">{label}</span>
            {active && (
                <div className="ml-auto w-1.5 h-1.5 bg-blue-400 rounded-full hidden lg:block shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div>
            )}
        </button>
    );
};

