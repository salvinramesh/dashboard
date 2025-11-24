// API utilities for systems management

const API_BASE = 'http://127.0.0.1:3001/api/systems';

export const systemsAPI = {
    // Get all systems
    getAll: async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        try {
            console.log('Fetching systems from:', API_BASE);
            const response = await fetch(API_BASE, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Failed to fetch systems');
            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    // Get single system
    getById: async (id) => {
        const response = await fetch(`${API_BASE}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch system');
        return response.json();
    },

    // Create new system
    create: async (system) => {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
            method: 'DELETE'
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
