const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');

// Store active agent sockets: Map<systemId, Socket>
const agentSockets = new Map();

// Store pending command responses: Map<requestId, {resolve, reject, timeout}>
const pendingRequests = new Map();

const handleAgentConnection = (socket, io) => {
    let systemId = null;

    socket.on('register', ({ id, token }) => {
        try {
            // Verify token
            // The agent should sign a token with the shared secret
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.role !== 'agent' && decoded.role !== 'system') {
                console.warn(`[AgentManager] Invalid role for agent ${id}`);
                socket.emit('register-error', 'Invalid role');
                return;
            }

            systemId = id;
            agentSockets.set(id, socket);
            console.log(`[AgentManager] Agent registered: ${id} (${socket.id})`);
            socket.emit('register-success');

            // Notify frontend/monitor that agent is online?
            // For now, the monitor loop will just succeed when it asks for stats.

        } catch (err) {
            console.error(`[AgentManager] Registration failed for ${id}:`, err.message);
            socket.emit('register-error', 'Authentication failed');
            socket.disconnect();
        }
    });

    socket.on('disconnect', () => {
        if (systemId) {
            console.log(`[AgentManager] Agent disconnected: ${systemId}`);
            agentSockets.delete(systemId);
        }
    });

    // Handle responses to commands
    socket.on('command-response', ({ requestId, data, error }) => {
        const pending = pendingRequests.get(requestId);
        if (pending) {
            if (error) {
                pending.reject(new Error(error));
            } else {
                pending.resolve(data);
            }
            clearTimeout(pending.timeout);
            pendingRequests.delete(requestId);
        }
    });
};

// Helper to send a command and wait for response
const sendCommand = (systemId, command, payload = {}, timeoutMs = 10000) => {
    return new Promise((resolve, reject) => {
        const socket = agentSockets.get(systemId);
        if (!socket) {
            return reject(new Error('Agent not connected'));
        }

        const requestId = Math.random().toString(36).substring(7);
        const timeout = setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error('Command timed out'));
            }
        }, timeoutMs);

        pendingRequests.set(requestId, { resolve, reject, timeout });

        socket.emit('command', {
            requestId,
            type: command,
            payload
        });
    });
};

const isAgentConnected = (systemId) => {
    return agentSockets.has(systemId);
};

const getAgentSocket = (systemId) => {
    return agentSockets.get(systemId);
};

module.exports = {
    handleAgentConnection,
    sendCommand,
    isAgentConnected,
    getAgentSocket
};
