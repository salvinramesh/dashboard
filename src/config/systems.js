// Configuration for all monitored systems
import { getStoredSystems } from '../utils/storage';

const defaultSystems = [
    {
        id: 'local-primary',
        name: 'Primary Server',
        description: 'Main production server',
        apiUrl: 'http://localhost:3001',
        color: 'blue',
        icon: '🖥️'
    },
    {
        id: 'local-secondary',
        name: 'Development Server',
        description: 'Development environment',
        apiUrl: 'http://localhost:3002',
        color: 'purple',
        icon: '💻'
    }
];

// Get all systems - merge default with localStorage
export const getSystems = () => {
    const stored = getStoredSystems();
    return stored !== null ? stored : defaultSystems;
};

// Legacy export for backwards compatibility
export const systems = getSystems();

// Helper function to get system by ID
export const getSystemById = (id) => {
    return getSystems().find(system => system.id === id);
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
