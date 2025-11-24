// API utilities for systems management

const API_BASE = 'http://localhost:3001/api/systems';

export const systemsAPI = {
    // Get all systems
    getAll: async () => {
        const response = await fetch(API_BASE);
        if (!response.ok) throw new Error('Failed to fetch systems');
        return response.json();
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
