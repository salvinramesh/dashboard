const express = require('express');
const si = require('systeminformation');
const cors = require('cors');

const app = express();
const PORT = 3002;

app.use(cors());

app.get('/api/stats', async (req, res) => {
    try {
        const [cpu, mem, networkStats, osInfo] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats(),
            si.osInfo()
        ]);

        // Calculate network speed (simplified for this demo)
        // In a real app, we'd need to compare with previous sample
        // For now, just sending total rx/tx which is cumulative
        // But the frontend can calculate diff or we can do it here if we keep state.

        // Let's keep it stateless for now and send the raw data.
        // Actually, to show speed, we need rate.
        // systeminformation's networkStats returns rx_sec and tx_sec if available?
        // Let's check docs or just assume we send raw and frontend handles it or we use a different call.
        // si.networkStats() returns rx_sec which is bytes per second if supported.

        res.json({
            cpu: cpu.currentLoad,
            mem: {
                total: mem.total,
                used: mem.used,
                active: mem.active,
                available: mem.available
            },
            network: networkStats.map(iface => ({
                iface: iface.iface,
                rx_sec: iface.rx_sec,
                tx_sec: iface.tx_sec,
                rx_bytes: iface.rx_bytes,
                tx_bytes: iface.tx_bytes
            })),
            os: {
                platform: osInfo.platform,
                distro: osInfo.distro,
                release: osInfo.release,
                hostname: osInfo.hostname
            },
            uptime: si.time().uptime
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

const { sendAlert } = require('./webhook');
const { MONITOR_INTERVAL, MEMORY_THRESHOLD_PERCENT, DISK_THRESHOLD_PERCENT, ALERT_COOLDOWN } = require('./config');

// Alert state
let lastAlertTime = {
    memory: 0,
    disk: 0
};

// Monitoring loop
const monitorSystem = async () => {
    try {
        const [mem, fsSize] = await Promise.all([
            si.mem(),
            si.fsSize() // Note: fsSize might require elevated privileges on some systems
        ]);

        // Check Memory
        const memUsagePercent = (mem.active / mem.total) * 100;
        if (memUsagePercent > MEMORY_THRESHOLD_PERCENT) {
            const now = Date.now();
            if (now - lastAlertTime.memory > ALERT_COOLDOWN) {
                const msg = `🚨 *High Memory Usage Alert* on Secondary Server\nUsage: ${memUsagePercent.toFixed(1)}%`;
                console.log(msg);
                sendAlert(msg).catch(console.error);
                lastAlertTime.memory = now;
            }
        }

        // Check Disk
        // Note: fsSize() can be slow or fail without permission. 
        // If it fails, we catch the error.
        if (fsSize && fsSize.length > 0) {
            for (const disk of fsSize) {
                if (disk.use > DISK_THRESHOLD_PERCENT) {
                    const now = Date.now();
                    if (now - lastAlertTime.disk > ALERT_COOLDOWN) {
                        const msg = `🚨 *High Disk Usage Alert* on Secondary Server\nMount: ${disk.mount}\nUsage: ${disk.use}%`;
                        console.log(msg);
                        sendAlert(msg).catch(console.error);
                        lastAlertTime.disk = now;
                        break;
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error in monitoring loop:', error);
    }
};

// Start monitoring
setInterval(monitorSystem, MONITOR_INTERVAL);

// Send startup alert
sendAlert('✅ *Server Started*: Secondary Server is now online.').catch(console.error);

const handleShutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down...`);
    try {
        await sendAlert(`🛑 *Server Stopping*: Secondary Server is going offline (${signal}).`);
    } catch (err) {
        console.error('Failed to send offline alert:', err);
    }
    process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
