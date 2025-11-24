import React from 'react';

export const TestDashboard = () => {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#09090b',
            color: 'white',
            padding: '2rem',
            fontFamily: 'monospace'
        }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Test Dashboard</h1>
            <p>If you can see this, React is rendering correctly.</p>
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: '#27272a',
                borderRadius: '0.5rem'
            }}>
                <h2>Backend Test</h2>
                <p>Checking API connection...</p>
                <APITest />
            </div>
        </div>
    );
};

const APITest = () => {
    const [data, setData] = React.useState(null);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        fetch('http://localhost:3001/api/stats')
            .then(res => res.json())
            .then(data => setData(data))
            .catch(err => setError(err.message));
    }, []);

    if (error) return <p style={{ color: 'red' }}>API Error: {error}</p>;
    if (!data) return <p>Loading...</p>;

    return (
        <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
            {JSON.stringify(data, null, 2)}
        </pre>
    );
};
