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
            if (error.name === 'AbortError') {
                console.log('Request aborted:', API_BASE);
                throw error; // Still throw, but caller should handle
            }
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

    // Get system history
    getHistory: async (id, range = '1h') => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
            const response = await fetch(`${API_BASE}/${id}/history?range=${range}`, {
                signal: controller.signal,
                headers: getHeaders()
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Failed to fetch history');
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
    },

    // Kill process
    killProcess: async (id, pid) => {
        const response = await fetch(`${API_BASE}/${id}/processes/${pid}/kill`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to kill process');
        }
        return response.json();
    },

    // Get services
    getServices: async (id) => {
        const response = await fetch(`${API_BASE}/${id}/services`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch services');
        return response.json();
    },

    // Control service
    controlService: async (id, name, action) => {
        const response = await fetch(`${API_BASE}/${id}/services/${name}/${action}`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to control service');
        }
        return response.json();
    },

    // Control Docker container
    controlContainer: async (id, containerId, action) => {
        const response = await fetch(`${API_BASE}/${id}/docker/${containerId}/${action}`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to control container');
        }
        return response.json();
    },

    // List files
    listFiles: async (id, path) => {
        const url = new URL(`${window.location.origin}${API_BASE}/${id}/files/list`);
        if (path) url.searchParams.append('path', path);

        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to list files');
        return response.json();
    },

    // Download file URL helper
    getFileDownloadUrl: (id, path) => {
        // We can't easily add headers to a direct link, so we might need a proxy token in the URL 
        // OR we use the fetch-blob method.
        // For simplicity, let's use the fetch method in the component to trigger download.
        return `${API_BASE}/${id}/files/download?path=${encodeURIComponent(path)}`;
    },

    // Download file (blob)
    downloadFile: async (id, path) => {
        const response = await fetch(`${API_BASE}/${id}/files/download?path=${encodeURIComponent(path)}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to download file');
        return response.blob();
    }
};

// Helper function to generate unique ID
export const generateId = () => {
    return `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
