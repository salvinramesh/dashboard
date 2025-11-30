const jwt = require('jsonwebtoken');
const { sendAlert } = require('./webhook');
const { MONITOR_INTERVAL, JWT_SECRET, MEMORY_THRESHOLD_PERCENT, DISK_THRESHOLD_PERCENT, ALERT_COOLDOWN } = require('./config');

let systemStatus = {};
let lastAlertTimes = {}; // Map of systemId -> { memory: timestamp, disk: timestamp }

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
                // Initialize alert tracking for new systems
                if (!lastAlertTimes[system.id]) {
                    lastAlertTimes[system.id] = { memory: 0, disk: 0 };
                }

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 40000);

                    const response = await fetch(system.api_url + '/api/stats', {
                        signal: controller.signal,
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const stats = await response.json();

                        // Check Resource Usage
                        const now = Date.now();

                        // 1. Memory Check
                        if (stats.mem && system.notifications_enabled) {
                            const memUsagePercent = (stats.mem.used / stats.mem.total) * 100;
                            if (memUsagePercent > MEMORY_THRESHOLD_PERCENT) {
                                const timeSinceLastAlert = now - lastAlertTimes[system.id].memory;

                                if (timeSinceLastAlert > ALERT_COOLDOWN) {
                                    const msg = `🚨 *High Memory Usage Alert* on ${system.name}\nUsage: ${memUsagePercent.toFixed(1)}%`;
                                    console.log(msg);
                                    sendAlert(msg).catch(console.error);
                                    lastAlertTimes[system.id].memory = now;
                                }
                            }
                        }

                        // 2. Disk Check
                        if (stats.disk && Array.isArray(stats.disk) && system.notifications_enabled) {
                            for (const disk of stats.disk) {
                                if (disk.use > DISK_THRESHOLD_PERCENT) {
                                    if (now - lastAlertTimes[system.id].disk > ALERT_COOLDOWN) {
                                        const msg = `🚨 *High Disk Usage Alert* on ${system.name}\nMount: ${disk.mount}\nUsage: ${disk.use}%`;
                                        console.log(msg);
                                        sendAlert(msg).catch(console.error);
                                        lastAlertTimes[system.id].disk = now;
                                        break; // Alert once per system per cooldown to avoid spam
                                    }
                                }
                            }
                        }

                        if (systemStatus[system.id] && !systemStatus[system.id].isOnline && system.notifications_enabled) {
                            const msg = `✅ *System Recovered*: ${system.name} is back online.`;
                            console.log(msg);
                            sendAlert(msg).catch(console.error);
                        }
                        systemStatus[system.id] = { isOnline: true, stats: stats, lastCheck: Date.now() };
                    } else {
                        throw new Error('Status ' + response.status);
                    }
                } catch (err) {
                    if ((!systemStatus[system.id] || systemStatus[system.id].isOnline) && system.notifications_enabled) {
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
