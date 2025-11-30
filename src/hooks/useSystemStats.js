import { useState, useEffect } from 'react';
import { systemsAPI } from '../utils/api';

export const useSystemStats = (systemId) => {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!systemId) return;

        const init = async () => {
            try {
                // Fetch history first
                const historyData = await systemsAPI.getHistory(systemId, '1h');
                setHistory(historyData);

                // Then fetch current stats
                const data = await systemsAPI.getStats(systemId);
                setStats(data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to initialize stats:', err);
                setError(err);
                setLoading(false);
            }
        };

        init();

        const fetchStats = async () => {
            try {
                const data = await systemsAPI.getStats(systemId);

                setStats(data);
                setHistory(prev => {
                    const newHistory = [...prev, { ...data, timestamp: Date.now() }];
                    // Keep last 60 points (approx 1 hour if polled every minute, but we poll every second? No, Dashboard polls every 1s? useSystemStats polls every 1s)
                    // Wait, useSystemStats polls every 1s. 
                    // If we fetch 1h of history, that's a lot of points if stored every minute.
                    // The history API returns points stored every minute.
                    // The live update adds points every second.
                    // This mismatch might look weird on the chart (dense vs sparse).
                    // But for now, let's just append.

                    // Limit history size to avoid memory issues. 1 hour of 1s updates = 3600 points.
                    if (newHistory.length > 3600) {
                        return newHistory.slice(newHistory.length - 3600);
                    }
                    return newHistory;
                });
            } catch (err) {
                // setError(err); // Don't set error on poll fail to avoid flashing
                console.error('Poll error:', err);
            }
        };

        const interval = setInterval(fetchStats, 5000); // Poll every 5 seconds instead of 1s to match backend save rate closer? No, user wants live feel.

        return () => clearInterval(interval);
    }, [systemId]);

    return { stats, history, loading, error };
};
