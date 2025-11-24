import { useState, useEffect } from 'react';

export const useSystemStats = (apiUrl = 'http://localhost:3001') => {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/stats`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();

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
    }, [apiUrl]);

    return { stats, history, loading, error };
};
