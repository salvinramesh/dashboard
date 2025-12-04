import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Terminal as TerminalIcon, Monitor, XCircle } from 'lucide-react';

const RemoteDesktop = ({ systemId }) => {
    const [socket, setSocket] = useState(null);
    const [imageSrc, setImageSrc] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const newSocket = io('http://117.247.180.176:3006', {
            query: { type: 'frontend' },
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
            newSocket.emit('connect-desktop', { systemId, token });
        });

        newSocket.on('screen-frame', (base64) => {
            setImageSrc(`data:image/jpeg;base64,${base64}`);
            setIsConnected(true);
            setError(null);
        });

        newSocket.on('error', (err) => {
            console.error('Desktop error:', err);
            setError(err);
            setIsConnected(false);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [systemId]);

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
            </div>

            <div className="flex-1 bg-black rounded border border-gray-800 overflow-hidden relative flex items-center justify-center">
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
                        className="max-w-full max-h-full object-contain"
                    />
                ) : (
                    <div className="text-gray-500 flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Connecting to remote desktop...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RemoteDesktop;
