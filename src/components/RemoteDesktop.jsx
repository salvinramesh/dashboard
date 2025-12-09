import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Terminal as TerminalIcon, Monitor, XCircle, MousePointer2 } from 'lucide-react';

const RemoteDesktop = ({ systemId }) => {
    const [socket, setSocket] = useState(null);
    const [imageSrc, setImageSrc] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [inputEnabled, setInputEnabled] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [showCursor, setShowCursor] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const imgRef = useRef(null);
    const containerRef = useRef(null);

    // Effect to initialize socket connection
    useEffect(() => {
        const token = localStorage.getItem('token');
        const newSocket = io('http://117.247.180.176:3006', {
            query: { type: 'frontend' },
            auth: { token }
        });
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [systemId]);

    // Effect to handle socket events once socket is initialized
    useEffect(() => {
        if (!socket) return;

        socket.on('connect', () => {
            console.log('Connected to Terminal Socket');
            setIsConnected(true);
            setError(null);
            socket.emit('join-desktop', systemId); // Emit join-desktop event
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
            setIsStreaming(false);
        });

        socket.on('screen-frame', (base64) => { // Changed to base64 as per original code
            setImageSrc(`data:image/jpeg;base64,${base64}`); // Changed to base64 as per original code
            setIsStreaming(true);
            setError(null);
        });

        socket.on('error', (err) => {
            console.error('Desktop error:', err);
            setError(err.message || 'Failed to connect to desktop stream'); // Use err.message
            setIsStreaming(false);
            setIsConnected(false); // Ensure isConnected is false on error
        });

        return () => {
            // Clean up listeners when component unmounts or socket changes
            socket.off('connect');
            socket.off('disconnect');
            socket.off('screen-frame');
            socket.off('error');
        };
    }, [systemId, socket]); // Depend on socket and systemId

    // Input Handling
    const handleMouseMove = (e) => {
        if (!imgRef.current) return;

        const rect = imgRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        // Update local cursor position for UI
        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setShowCursor(true); // Show custom cursor when mouse moves over the image

        if (!inputEnabled || !socket) return;

        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            socket.emit('input', {
                type: 'mousemove',
                x,
                y
            });
        }
    };

    const handleMouseEnter = () => {
        setIsHovering(true);
        setShowCursor(true);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        setShowCursor(false);
    };

    const handleMouseDown = (e) => {
        if (!inputEnabled || !socket) return;
        socket.emit('input', {
            type: 'mousedown',
            button: e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle'
        });
    };

    const handleMouseUp = (e) => {
        if (!inputEnabled || !socket) return;
        socket.emit('input', {
            type: 'mouseup',
            button: e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle'
        });
    };

    const handleKeyDown = (e) => {
        if (!inputEnabled || !socket) return;
        // Prevent default for common keys to avoid browser actions
        if (['Tab', 'Alt', 'Control', 'Meta', 'F5'].includes(e.key)) {
            e.preventDefault();
        }
        socket.emit('input', {
            type: 'keydown',
            key: e.key,
            code: e.code,
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
            meta: e.metaKey
        });
    };

    const handleKeyUp = (e) => {
        if (!inputEnabled || !socket) return;
        socket.emit('input', {
            type: 'keyup',
            key: e.key,
            code: e.code
        });
    };

    // Focus management for keyboard input
    useEffect(() => {
        if (inputEnabled && containerRef.current) {
            containerRef.current.focus();
        }
    }, [inputEnabled]);

    return (
        <div className="bg-gray-900 rounded-lg p-4 h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Monitor className="text-blue-400" size={20} />
                    <h3 className="text-lg font-semibold text-white">Remote Desktop</h3>
                    {isConnected && (
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setInputEnabled(!inputEnabled)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${inputEnabled
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    <MousePointer2 size={16} />
                    {inputEnabled ? 'Input Enabled' : 'Enable Input'}
                </button>
            </div>

            <div
                ref={containerRef}
                className="flex-1 bg-black rounded border border-gray-800 overflow-hidden relative flex items-center justify-center outline-none"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            >
                {/* Custom Cursor */}
                {showCursor && inputEnabled && (
                    <div
                        className="absolute pointer-events-none z-50"
                        style={{
                            left: cursorPos.x,
                            top: cursorPos.y,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <div className="w-4 h-4 bg-blue-500/50 rounded-full border border-white shadow-sm flex items-center justify-center">
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                        </div>
                    </div>
                )}

                {error ? (
                    <div className="text-red-400 flex flex-col items-center gap-2">
                        <XCircle size={32} />
                        <span>{error}</span>
                    </div>
                ) : imageSrc ? (
                    <img
                        ref={imgRef}
                        src={imageSrc}
                        alt="Remote Desktop"
                        className="w-full h-full object-contain select-none"
                        draggable="false"
                    />
                ) : (
                    <div className="text-gray-500 flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Connecting to remote desktop...</span>
                    </div>
                )}
            </div>
            {inputEnabled && (
                <div className="mt-2 text-xs text-gray-500 text-center">
                    Click inside the screen to focus. Press ESC to release focus if needed.
                </div>
            )}
        </div>
    );
};

export default RemoteDesktop;
