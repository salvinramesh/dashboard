// Configuration for all monitored systems
// Now fetched from database via API

const API_URL = 'http://localhost:3001/api/systems';

// Fetch systems from API
export const fetchSystems = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch systems');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching systems:', error);
        // Return default systems as fallback
        return getDefaultSystems();
    }
};

// Default systems (fallback)
const getDefaultSystems = () => [
    {
        id: 'local-primary',
        name: 'Primary Server',
        description: 'Main production server',
        api_url: 'http://localhost:3001',
        color: 'blue',
        icon: '🖥️'
    },
    {
        id: 'local-secondary',
        name: 'Development Server',
        description: 'Development environment',
        api_url: 'http://localhost:3002',
        color: 'purple',
        icon: '💻'
    }
];

// Legacy sync function - kept for backwards compatibility
// Will be removed once all components use async fetch
export const getSystems = () => {
    return getDefaultSystems();
};

// Helper function to get system by ID
export const getSystemById = async (id) => {
    const systems = await fetchSystems();
    return systems.find(system => system.id === id);
};

// Color mappings for different themes
export const colorThemes = {
    blue: {
        primary: 'bg-blue-600',
        primaryHover: 'hover:bg-blue-700',
        light: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400'
    },
    purple: {
        primary: 'bg-purple-600',
        primaryHover: 'hover:bg-purple-700',
        light: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400'
    },
    green: {
        primary: 'bg-green-600',
        primaryHover: 'hover:bg-green-700',
        light: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400'
    },
    orange: {
        primary: 'bg-orange-600',
        primaryHover: 'hover:bg-orange-700',
        light: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400'
    }
};
