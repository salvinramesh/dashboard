import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io } from 'socket.io-client';
import 'xterm/css/xterm.css';
import { X, Maximize2, Minimize2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3006`;

export const Terminal = ({ systemId, systemName, onClose }) => {
    const terminalRef = useRef(null);
    const socketRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [status, setStatus] = useState('Connecting...');

    useEffect(() => {
        // 1. Initialize Socket first (independent of UI)
        const token = localStorage.getItem('token');
        // Use relative path to leverage Vite proxy
        const socketUrl = '/';
        console.log('Connecting to Terminal Socket:', socketUrl);

        const socket = io(socketUrl, {
            transports: ['polling', 'websocket'],
            reconnection: true,
            withCredentials: true,
            path: '/socket.io' // Default path, explicitly stated
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected, ID:', socket.id);
            setStatus('Connected to Server. Authenticating...');
            socket.emit('connect-terminal', { systemId, token });
        });

        socket.on('output', (data) => {
            if (xtermRef.current) {
                xtermRef.current.write(data);
            }
            setStatus('Connected');
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
            if (xtermRef.current) {
                xtermRef.current.write(`\r\n\x1b[31mError: ${err}\x1b[0m\r\n`);
            }
            setStatus('Error');
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            if (xtermRef.current) {
                xtermRef.current.write('\r\n\x1b[33mDisconnected from server.\x1b[0m\r\n');
            }
            setStatus('Disconnected');
        });

        // 2. Initialize XTerm only when container is ready
        const initTerminal = () => {
            if (!terminalRef.current || xtermRef.current) return;

            // Check dimensions
            const rect = terminalRef.current.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            try {
                const term = new XTerm({
                    cursorBlink: true,
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#ffffff',
                    },
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    fontSize: 14,
                });

                const fitAddon = new FitAddon();
                term.loadAddon(fitAddon);

                term.open(terminalRef.current);
                fitAddon.fit();

                xtermRef.current = term;
                fitAddonRef.current = fitAddon;

                // Bind input
                term.onData((data) => {
                    socket.emit('input', data);
                });

                term.onResize((size) => {
                    socket.emit('resize', size);
                });

                // Initial resize emit
                socket.emit('resize', { cols: term.cols, rows: term.rows });

            } catch (err) {
                console.error('Failed to initialize terminal:', err);
            }
        };

        // Observer to trigger init when visible
        const resizeObserver = new ResizeObserver(() => {
            if (!xtermRef.current) {
                initTerminal();
            } else {
                // Fit if already initialized
                try {
                    fitAddonRef.current?.fit();
                    socket.emit('resize', {
                        cols: xtermRef.current.cols,
                        rows: xtermRef.current.rows
                    });
                } catch (e) {
                    // Ignore dimensions error
                }
            }
        });

        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        // Cleanup
        return () => {
            socket.disconnect();
            if (xtermRef.current) {
                xtermRef.current.dispose();
            }
            resizeObserver.disconnect();
        };
    }, [systemId]);

    // Re-fit on fullscreen toggle
    useEffect(() => {
        setTimeout(() => {
            try {
                fitAddonRef.current?.fit();
            } catch (e) { }
        }, 100);
    }, [isFullscreen]);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 ${isFullscreen ? 'p-0' : 'p-4'}`}>
            <div className={`bg-[#1e1e1e] rounded-lg shadow-2xl overflow-hidden flex flex-col ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl h-[600px]'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3d3d3d]">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span className="text-sm font-medium text-gray-300">Terminal: {systemName}</span>
                        <span className="text-xs text-gray-500">({status})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-1 hover:bg-[#3d3d3d] rounded text-gray-400 hover:text-white transition-colors"
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-[#3d3d3d] rounded text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
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
