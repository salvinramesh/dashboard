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
        const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60s

        try {
            console.log('Fetching systems from:', API_BASE);
            const response = await fetch(API_BASE, {
                signal: controller.signal,
                headers: getHeaders()
            });
            clearTimeout(timeoutId);
            if (response.status === 401 || response.status === 403) {
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

    // Get system stats (CPU, Mem, Network)
    getStats: async (id) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
            const response = await fetch(`${API_BASE}/${id}/stats`, {
                signal: controller.signal,
                headers: getHeaders()
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Failed to fetch stats');
            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    // Get system resources (processes, docker)
    getResources: async (id) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
            const response = await fetch(`${API_BASE}/${id}/resources`, {
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
    getSecurity: async (id) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
            const response = await fetch(`${API_BASE}/${id}/security`, {
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
