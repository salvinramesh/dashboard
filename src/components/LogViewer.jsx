import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io } from 'socket.io-client';
import 'xterm/css/xterm.css';
import { X, Play, Square, FileText } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006';

const COMMON_LOGS = [
    { name: 'Syslog (Linux)', path: '/var/log/syslog' },
    { name: 'Auth Log (Linux)', path: '/var/log/auth.log' },
    { name: 'Nginx Access (Linux)', path: '/var/log/nginx/access.log' },
    { name: 'Nginx Error (Linux)', path: '/var/log/nginx/error.log' },
    { name: 'Apache Access (Linux)', path: '/var/log/apache2/access.log' },
    { name: 'Apache Error (Linux)', path: '/var/log/apache2/error.log' },
    { name: 'Windows Update (Win)', path: 'C:\\Windows\\WindowsUpdate.log' },
];

export const LogViewer = ({ systemId, systemName, onClose }) => {
    const terminalRef = useRef(null);
    const socketRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);

    const [logPath, setLogPath] = useState('/var/log/syslog');
    const [isWatching, setIsWatching] = useState(false);
    const [status, setStatus] = useState('Connecting...');

    useEffect(() => {
        // Initialize XTerm
        const term = new XTerm({
            cursorBlink: false,
            disableStdin: true, // Read-only
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 13,
            scrollback: 5000
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (terminalRef.current) {
            term.open(terminalRef.current);
            fitAddon.fit();
        }

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Connect to Socket
        const token = localStorage.getItem('token');
        const socket = io(API_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            setStatus('Connected to Server');
            socket.emit('connect-terminal', { systemId, token });
        });

        socket.on('log-output', (data) => {
            // Convert newlines to CRLF for xterm
            const formatted = data.replace(/\n/g, '\r\n');
            term.write(formatted);
        });

        socket.on('log-error', (err) => {
            term.write(`\r\n\x1b[31mError: ${err}\x1b[0m\r\n`);
            setIsWatching(false);
        });

        socket.on('log-exit', (code) => {
            term.write(`\r\n\x1b[33mLog process exited with code ${code}\x1b[0m\r\n`);
            setIsWatching(false);
        });

        socket.on('error', (err) => {
            term.write(`\r\n\x1b[31mConnection Error: ${err}\x1b[0m\r\n`);
            setStatus('Error');
        });

        socket.on('disconnect', () => {
            setStatus('Disconnected');
            setIsWatching(false);
        });

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            socket.disconnect();
            term.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [systemId]);

    const startWatching = () => {
        if (!socketRef.current || !logPath) return;

        xtermRef.current.clear();
        xtermRef.current.write(`\x1b[32m>>> Starting watch on ${logPath}...\x1b[0m\r\n`);

        socketRef.current.emit('watch-log', { path: logPath });
        setIsWatching(true);
    };

    const stopWatching = () => {
        if (!socketRef.current) return;
        socketRef.current.emit('stop-log');
        xtermRef.current.write(`\r\n\x1b[33m>>> Stopped watching.\x1b[0m\r\n`);
        setIsWatching(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1e1e1e] rounded-lg shadow-2xl overflow-hidden flex flex-col w-full max-w-5xl h-[700px]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#2d2d2d] border-b border-[#3d3d3d]">
                    <div className="flex items-center gap-3">
                        <FileText size={18} className="text-blue-400" />
                        <span className="font-medium text-gray-200">Log Viewer: {systemName}</span>
                        <span className="text-xs text-zinc-500">({status})</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[#3d3d3d] rounded text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Controls */}
                <div className="p-4 bg-[#252526] border-b border-[#3d3d3d] flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-zinc-500 mb-1">Log File Path</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={logPath}
                                onChange={(e) => setLogPath(e.target.value)}
                                className="flex-1 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                                placeholder="/path/to/logfile.log"
                            />
                            <select
                                onChange={(e) => setLogPath(e.target.value)}
                                className="bg-[#1e1e1e] border border-[#3d3d3d] rounded px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500 w-8"
                            >
                                <option value="">Presets</option>
                                {COMMON_LOGS.map((log, i) => (
                                    <option key={i} value={log.path}>{log.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-end gap-2">
                        {!isWatching ? (
                            <button
                                onClick={startWatching}
                                className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
                            >
                                <Play size={14} /> Start
                            </button>
                        ) : (
                            <button
                                onClick={stopWatching}
                                className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors"
                            >
                                <Square size={14} /> Stop
                            </button>
                        )}
                    </div>
                </div>

                {/* Terminal Container */}
                <div className="flex-1 relative p-2 bg-[#1e1e1e]">
                    <div ref={terminalRef} className="absolute inset-0" />
                </div>
            </div>
        </div>
    );
};
