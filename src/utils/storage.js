// Utility functions for managing systems in localStorage

const STORAGE_KEY = 'system-monitor-systems';

// Get systems from localStorage
export const getStoredSystems = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error reading systems from localStorage:', error);
        return null;
    }
};

// Save systems to localStorage
export const saveSystemsToStorage = (systems) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
        return true;
    } catch (error) {
        console.error('Error saving systems to localStorage:', error);
        return false;
    }
};

// Add a new system
export const addSystem = (newSystem) => {
    const systems = getStoredSystems() || [];
    systems.push(newSystem);
    return saveSystemsToStorage(systems);
};

// Update an existing system
export const updateSystem = (id, updatedSystem) => {
    const systems = getStoredSystems() || [];
    const index = systems.findIndex(s => s.id === id);
    if (index !== -1) {
        systems[index] = { ...systems[index], ...updatedSystem };
        return saveSystemsToStorage(systems);
    }
    return false;
};

// Delete a system
export const deleteSystem = (id) => {
    const systems = getStoredSystems() || [];
    const filtered = systems.filter(s => s.id !== id);
    return saveSystemsToStorage(filtered);
};

// Generate a unique ID
export const generateId = () => {
    return `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
