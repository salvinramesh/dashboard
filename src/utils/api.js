// API utilities for systems management

const API_BASE = '/api/systems';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const systemsAPI = {
    // Get all systems
    getAll: async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
            console.log('Fetching systems from:', API_BASE);
            const response = await fetch(API_BASE, {
                signal: controller.signal,
                headers: getHeaders()
            });
            clearTimeout(timeoutId);
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.reload();
            }
            if (!response.ok) throw new Error('Failed to fetch systems');
            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    // Get single system
    getById: async (id) => {
        const response = await fetch(`${API_BASE}/${id}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch system');
        return response.json();
    },

    // Get system resources (processes, docker)
    getResources: async (apiUrl) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            // Note: This call goes to the remote system directly? 
            // If so, it might not need our auth token unless we proxy it through our backend.
            // Based on previous code, it seems we might be calling the remote agent directly.
            // BUT, the backend index.js has /api/resources protected.
            // If apiUrl points to OUR backend (proxy), we need auth.
            // If it points to remote agent, we might not.
            // Given the architecture, let's assume we need to send auth if it's our backend.
            // However, the systems have their own API URL.
            // If the system.api_url is external, sending our token might be wrong.
            // But wait, the previous implementation was `fetch(system.api_url + '/api/stats')`.
            // If we are protecting OUR backend routes, we need to make sure we are calling OUR backend or the remote one.
            // The `systemsAPI.getResources` takes `apiUrl`.
            // If `apiUrl` is `http://localhost:3001`, we need auth.

            // Let's assume for now we just pass headers. If it's a remote agent that doesn't check auth, it might ignore it.
            const response = await fetch(`${apiUrl}/api/resources`, {
                signal: controller.signal,
                headers: getHeaders()
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Failed to fetch resources');
            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    // Get system security info (connections, users)
    getSecurity: async (apiUrl) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(`${apiUrl}/api/security`, {
                signal: controller.signal,
                headers: getHeaders()
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Failed to fetch security info');
            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    // Create new system
    create: async (system) => {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(system)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create system');
        }
        return response.json();
    },

    // Update system
    update: async (id, updates) => {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update system');
        }
        return response.json();
    },

    // Delete system
    delete: async (id) => {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete system');
        }
        return response.json();
    }
};

// Helper function to generate unique ID
export const generateId = () => {
    return `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
