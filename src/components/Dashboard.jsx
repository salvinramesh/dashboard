import React from 'react';
import { useSystemStats } from '../hooks/useSystemStats';
import { MetricCard } from './MetricCard';
import { Sidebar } from './Sidebar';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cpu, Network, Zap, Clock, Box, Server, Globe } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800 p-3 rounded-xl shadow-2xl text-xs">
                <p className="text-zinc-500 mb-1 font-mono">{new Date(label).toLocaleTimeString()}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-zinc-300 font-medium">{entry.name}:</span>
                        <span className="text-white font-mono">{entry.value.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const Dashboard = ({ system, onBack, onNavigate }) => {
    const { stats, history, loading, error } = useSystemStats(system?.id);

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-500 font-mono animate-pulse">
            INITIALIZING SYSTEM LINK...
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-screen bg-zinc-950 text-red-500 font-mono">
            CONNECTION FAILURE: {error.message}
        </div>
    );

    if (!stats) return null;

    const cpuData = history.map(h => ({
        time: h.timestamp,
        load: typeof h.cpu === 'object' ? h.cpu.load : h.cpu
    }));

    const memData = history.map(h => ({
        time: h.timestamp,
        used: (h.mem.used / 1024 / 1024 / 1024).toFixed(2),
        total: (h.mem.total / 1024 / 1024 / 1024).toFixed(2)
    }));

    const netData = history.map(h => ({
        time: h.timestamp,
        rx: h.network[0]?.rx_bytes / 1024 / 1024 || 0,
        tx: h.network[0]?.tx_bytes / 1024 / 1024 || 0
    }));

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
            <Sidebar currentPage={system ? 'detail' : 'overview'} onNavigate={onNavigate} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-7xl mx-auto">
                    {/* Back Button */}
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="mb-6 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
                        >
                            <svg
                                className="w-5 h-5 transition-transform group-hover:-translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Back to Overview</span>
                        </button>
                    )}

                    {/* Header */}
                    <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                                {system?.name || 'Overview'}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-zinc-500 text-sm font-medium">
                                <span className="flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800/50">
                                    <Box size={14} />
                                    {stats.os.distro} {stats.os.release}
                                </span>
                                <span className="flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800/50">
                                    <Server size={14} />
                                    {stats.os.hostname}
                                </span>
                                {stats.interfaces && stats.interfaces
                                    .filter(iface => !iface.internal && iface.ip4)
                                    .map((iface, i) => (
                                        <span key={i} className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                                            <Network size={14} />
                                            {iface.iface}: {iface.ip4}
                                        </span>
                                    ))}
                                {stats.wanIp && (
                                    <span className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20">
                                        <Globe size={14} />
                                        WAN: {stats.wanIp}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">System Uptime</p>
                                <p className="text-xl font-mono text-white">{(stats.uptime / 3600).toFixed(1)}<span className="text-zinc-600 text-sm">h</span></p>
                            </div>
                            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                                <Clock className="text-blue-500" size={20} />
                            </div>
                        </div>
                    </header>

                    {/* Summary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <MetricCard
                            title="CPU Usage"
                            value={`${(typeof stats.cpu === 'object' ? stats.cpu.load : stats.cpu).toFixed(1)}%`}
                            subValue={`${typeof stats.cpu === 'object' ? stats.cpu.cores : '?'} Cores`}
                            icon={Cpu}
                            trend={+2.5}
                            color="blue"
                        />
                        <MetricCard
                            title="Memory Usage"
                            value={`${(stats.mem.used / 1024 / 1024 / 1024).toFixed(1)} GB`}
                            subValue={`${(stats.mem.total / 1024 / 1024 / 1024).toFixed(1)} GB Total`}
                            icon={Zap}
                            trend={-1.2}
                            color="purple"
                        />
                        <MetricCard
                            title="Total Disk Usage"
                            value={stats.disk ? `${(stats.disk.reduce((acc, drive) => acc + drive.used, 0) / 1024 / 1024 / 1024).toFixed(1)} GB` : 'N/A'}
                            subValue={stats.disk ? `${(stats.disk.reduce((acc, drive) => acc + drive.size, 0) / 1024 / 1024 / 1024).toFixed(1)} GB Total (${stats.disk.length} Drives)` : 'No Data'}
                            icon={Server}
                            trend={0}
                            color="orange"
                        />
                        <MetricCard
                            title="Network Traffic"
                            value={`${(stats.network[0]?.rx_sec / 1024).toFixed(1)} KB/s`}
                            subValue="Total Bandwidth"
                            icon={Network}
                            trend={+5.4}
                            color="green"
                        />
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* CPU */}
                        <MetricCard title="Processor Load" className="col-span-1 lg:col-span-2 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Cpu size={120} />
                            </div>
                            <div className="h-72 w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={cpuData}>
                                        <XAxis dataKey="time" hide />
                                        <defs>
                                            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="load"
                                            stroke="#60A5FA"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorCpu)"
                                            name="Load %"
                                            animationDuration={1000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-6 flex items-end justify-between">
                                <div>
                                    <p className="text-4xl font-bold text-white tracking-tighter">
                                        {(typeof stats.cpu === 'object' ? stats.cpu.load : stats.cpu).toFixed(1)}
                                        <span className="text-lg text-zinc-500 font-normal ml-1">%</span>
                                    </p>
                                    <p className="text-zinc-500 text-sm mt-1">
                                        {typeof stats.cpu === 'object'
                                            ? `${stats.cpu.cores} Cores / ${stats.cpu.brand}`
                                            : 'Real-time utilization'}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-1.5 h-6 rounded-full ${i < (typeof stats.cpu === 'object' ? stats.cpu.load : stats.cpu) / 20 ? 'bg-blue-500' : 'bg-zinc-800'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </MetricCard>

                        {/* Memory */}
                        <MetricCard title="Memory Allocation">
                            <div className="relative h-48 flex items-center justify-center">
                                {/* Circular Progress Placeholder - Recharts Pie would be better but keeping it simple for now */}
                                <div className="relative w-40 h-40">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="#27272a"
                                            strokeWidth="12"
                                            fill="transparent"
                                        />
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="#10b981"
                                            strokeWidth="12"
                                            fill="transparent"
                                            strokeDasharray={440}
                                            strokeDashoffset={440 - (440 * (stats.mem.used / stats.mem.total))}
                                            className="transition-all duration-1000 ease-out"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-white">
                                            {Math.round((stats.mem.used / stats.mem.total) * 100)}%
                                        </span>
                                        <span className="text-xs text-zinc-500 uppercase">Used</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 mt-4">
                                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                                    <span className="text-zinc-400 text-sm">Active</span>
                                    <span className="font-mono text-white">{(stats.mem.used / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                                    <span className="text-zinc-400 text-sm">Total</span>
                                    <span className="font-mono text-zinc-500">{(stats.mem.total / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                                </div>
                            </div>
                        </MetricCard>



                        {/* Network */}
                        <MetricCard title="Network Traffic" className="col-span-1 lg:col-span-3">
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={netData}>
                                        <XAxis dataKey="time" hide />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line
                                            type="monotone"
                                            dataKey="rx"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            dot={false}
                                            name="RX (MB)"
                                            animationDuration={1000}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="tx"
                                            stroke="#f43f5e"
                                            strokeWidth={3}
                                            dot={false}
                                            name="TX (MB)"
                                            animationDuration={1000}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-4 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                                    <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                                        <Network className="text-violet-500" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-xs uppercase font-bold">Total Received</p>
                                        <p className="text-2xl font-mono text-white">{(stats.network[0]?.rx_bytes / 1024 / 1024).toFixed(2)} <span className="text-sm text-zinc-600">MB</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                                        <Zap className="text-rose-500" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-xs uppercase font-bold">Total Transmitted</p>
                                        <p className="text-2xl font-mono text-white">{(stats.network[0]?.tx_bytes / 1024 / 1024).toFixed(2)} <span className="text-sm text-zinc-600">MB</span></p>
                                    </div>
                                </div>
                            </div>
                        </MetricCard>
                    </div>
                </main>
            </div>
        </div>
    );
};
