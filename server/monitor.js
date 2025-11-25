const jwt = require('jsonwebtoken');
const { sendAlert } = require('./webhook');
const { MONITOR_INTERVAL, JWT_SECRET } = require('./config');

let systemStatus = {};

const getSystemStatus = (id) => {
    return systemStatus[id];
};

const getMonitorToken = () => {
    return jwt.sign({ username: 'monitor', role: 'system' }, JWT_SECRET, { expiresIn: '1h' });
};

const startMonitoring = (pool) => {
    const checkSystemsAvailability = async () => {
        try {
            const res = await pool.query('SELECT * FROM systems');
            const systems = res.rows;
            const token = getMonitorToken();

            for (const system of systems) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    const response = await fetch(system.api_url + '/api/stats', {
                        signal: controller.signal,
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const stats = await response.json();

                        if (systemStatus[system.id] && !systemStatus[system.id].isOnline) {
                            const msg = `✅ *System Recovered*: ${system.name} is back online.`;
                            console.log(msg);
                            sendAlert(msg).catch(console.error);
                        }
                        systemStatus[system.id] = { isOnline: true, stats: stats, lastCheck: Date.now() };
                    } else {
                        throw new Error('Status ' + response.status);
                    }
                } catch (err) {
                    if (!systemStatus[system.id] || systemStatus[system.id].isOnline) {
                        const msg = `🛑 *System Offline*: ${system.name} is unreachable. Error: ${err.message}`;
                        console.log(msg);
                        sendAlert(msg).catch(console.error);
                    }
                    // Keep old stats if available, just mark offline
                    const oldStats = systemStatus[system.id]?.stats;
                    systemStatus[system.id] = { isOnline: false, stats: oldStats, lastCheck: Date.now() };
                }
            }
        } catch (err) {
            console.error('Monitoring error:', err);
        }
    };

    // Initial check
    checkSystemsAvailability();

    // Start interval
    setInterval(checkSystemsAvailability, MONITOR_INTERVAL);
};

module.exports = {
    startMonitoring,
    getSystemStatus
};
