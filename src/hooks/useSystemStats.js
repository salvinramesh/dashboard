import { useState, useEffect } from 'react';
import { systemsAPI } from '../utils/api';

export const useSystemStats = (systemId) => {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!systemId) return;

        const fetchStats = async () => {
            try {
                const data = await systemsAPI.getStats(systemId);

                setStats(data);
                setHistory(prev => {
                    const newHistory = [...prev, { ...data, timestamp: Date.now() }];
                    if (newHistory.length > 60) {
                        return newHistory.slice(newHistory.length - 60);
                    }
                    return newHistory;
                });
                setLoading(false);
            } catch (err) {
                setError(err);
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 1000);

        return () => clearInterval(interval);
    }, [systemId]);

    return { stats, history, loading, error };
};
