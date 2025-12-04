import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { systemsAPI } from '../utils/api';
import { Folder, File, Download, ArrowUp, Home, Search, HardDrive } from 'lucide-react';

export const FileManager = ({ system, onNavigate }) => {
    const [currentPath, setCurrentPath] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (system) {
            loadFiles();
        }
    }, [system, currentPath]);

    const loadFiles = async () => {
        try {
            setLoading(true);
            const result = await systemsAPI.listFiles(system.id, currentPath);
            setItems(result.items);
            setCurrentPath(result.path); // Update path to canonical path returned by server
            setError(null);
        } catch (err) {
            console.error('Failed to list files:', err);
            setError('Failed to list files: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigateDir = (name) => {
        if (currentPath === 'ROOT') {
            setCurrentPath(name); // Drive letter (e.g. "C:")
            return;
        }

        const separator = currentPath.includes('\\') ? '\\' : '/'; // Simple heuristic
        // Handle root cases
        let newPath;
        if (currentPath === '/' || currentPath.endsWith(':\\')) {
            newPath = `${currentPath}${name}`;
        } else {
            newPath = `${currentPath}${separator}${name}`;
        }
        setCurrentPath(newPath);
    };

    const handleGoUp = () => {
        if (currentPath === 'ROOT') return;

        // If at drive root (e.g. C:\), go to ROOT (Drives list)
        if (currentPath.endsWith(':\\') || currentPath === '/') {
            setCurrentPath('ROOT');
            return;
        }

        const separator = currentPath.includes('\\') ? '\\' : '/';
        const parts = currentPath.split(separator).filter(Boolean);
        parts.pop();
        const newPath = parts.length === 0 ? '/' : parts.join(separator);

        // Fix for Windows root (e.g. C:)
        if (currentPath.includes(':') && parts.length === 1) {
            setCurrentPath(parts[0] + '\\');
        } else {
            setCurrentPath(currentPath.startsWith('/') ? '/' + newPath : newPath);
        }
    };

    const handleDownload = async (name) => {
        try {
            const separator = currentPath.includes('\\') ? '\\' : '/';
            const filePath = currentPath.endsWith(separator) ? `${currentPath}${name}` : `${currentPath}${separator}${name}`;

            const blob = await systemsAPI.downloadFile(system.id, filePath);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Failed to download file:', err);
            alert('Failed to download file');
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    if (!system) return null;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            <Sidebar currentPage="files" onNavigate={onNavigate} />

            <div className="pl-20 lg:pl-64 transition-all duration-300">
                <main className="p-8 lg:p-12 max-w-7xl mx-auto">
                    <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                                <HardDrive className="text-yellow-500" /> File Manager
                            </h1>
                            <p className="text-zinc-500">Browse and download files from {system.name}</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-64"
                            />
                        </div>
                    </header>

                    {/* Breadcrumbs / Path Bar */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6 flex items-center gap-4">
                        <button
                            onClick={handleGoUp}
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            title="Go Up"
                            disabled={currentPath === 'ROOT'}
                        >
                            <ArrowUp size={20} />
                        </button>
                        <div className="flex-1 font-mono text-sm text-zinc-300 truncate">
                            {currentPath === 'ROOT' ? 'My PC' : (currentPath || 'Loading...')}
                        </div>
                        <button
                            onClick={() => setCurrentPath('ROOT')} // Go to Drives
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            title="Drives"
                        >
                            <HardDrive size={20} />
                        </button>
                        <button
                            onClick={() => setCurrentPath('')} // Reset to default/root
                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            title="Go Home"
                        >
                            <Home size={20} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="animate-pulse text-zinc-500">Loading files...</div>
                    ) : error ? (
                        <div className="text-red-500 bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</div>
                    ) : (
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-900 text-zinc-500 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="p-4 w-12"></th>
                                        <th className="p-4">Name</th>
                                        <th className="p-4 text-right">Size</th>
                                        <th className="p-4 text-right">Modified</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {filteredItems.map((item, i) => (
                                        <tr key={i} className="hover:bg-zinc-800/50 transition-colors group">
                                            <td className="p-4 text-zinc-400">
                                                {currentPath === 'ROOT' ? <HardDrive className="text-yellow-500" size={20} /> : (item.isDirectory ? <Folder className="text-blue-400" size={20} /> : <File className="text-zinc-500" size={20} />)}
                                            </td>
                                            <td className="p-4 font-medium text-white">
                                                {item.isDirectory ? (
                                                    <button
                                                        onClick={() => handleNavigateDir(item.name)}
                                                        className="hover:underline hover:text-blue-400 text-left"
                                                    >
                                                        {item.name}
                                                    </button>
                                                ) : (
                                                    <span>{item.name}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right text-zinc-500 font-mono">
                                                {item.isDirectory ? '-' : formatSize(item.size)}
                                            </td>
                                            <td className="p-4 text-right text-zinc-500">
                                                {new Date(item.modified).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                {!item.isDirectory && (
                                                    <button
                                                        onClick={() => handleDownload(item.name)}
                                                        className="text-zinc-500 hover:text-blue-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Download"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredItems.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-zinc-500">No files found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
