const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use((req, res, next) => {
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json());

// Global request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Routes
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const systemsRouter = require('./routes/systems');
const authenticateToken = require('./middleware/auth');

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/systems', authenticateToken, systemsRouter);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Protected Stats Endpoints
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const [cpu, mem, networkStats, osInfo, cpuInfo, fsSize, uptime, networkInterfaces] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats(),
            si.osInfo(),
            si.cpu(),
            si.fsSize(),
            si.time(),
            si.networkInterfaces()
        ]);

        res.json({
            cpu: {
                load: cpu.currentLoad,
                cores: cpuInfo.cores,
                brand: cpuInfo.brand
            },
            mem: {
                total: mem.total,
                used: mem.used,
                active: mem.active,
                available: mem.available
            },
            disk: fsSize,
            network: networkStats.map(iface => ({
                iface: iface.iface,
                rx_sec: iface.rx_sec,
                tx_sec: iface.tx_sec,
                rx_bytes: iface.rx_bytes,
                tx_bytes: iface.tx_bytes
            })),
            interfaces: networkInterfaces,
            os: {
                platform: osInfo.platform,
                distro: osInfo.distro,
                release: osInfo.release,
                hostname: osInfo.hostname
            },
            uptime: uptime.uptime
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

app.get('/api/resources', authenticateToken, async (req, res) => {
    try {
        const [processes, docker] = await Promise.all([
            si.processes(),
            si.dockerContainers()
        ]);

        res.json({
            processes: processes.list.slice(0, 20),
            docker: docker
        });
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

app.get('/api/security', authenticateToken, async (req, res) => {
    try {
        const [connections, users] = await Promise.all([
            si.networkConnections(),
            si.users()
        ]);

        res.json({
            connections: connections.filter(c => c.state === 'LISTEN' || c.state === 'ESTABLISHED'),
            users: users
        });
    } catch (error) {
        console.error('Error fetching security info:', error);
        res.status(500).json({ error: 'Failed to fetch security info' });
    }
});

// Webhook & Monitoring
const { sendAlert } = require('./webhook');
const { MONITOR_INTERVAL, MEMORY_THRESHOLD_PERCENT, DISK_THRESHOLD_PERCENT, ALERT_COOLDOWN } = require('./config');

let lastAlertTime = { memory: 0, disk: 0 };

const monitorSystem = async () => {
    try {
        const [mem, fsSize] = await Promise.all([
            si.mem(),
            si.fsSize()
        ]);

        // Check Memory
        const memUsagePercent = (mem.active / mem.total) * 100;
        if (memUsagePercent > MEMORY_THRESHOLD_PERCENT) {
            const now = Date.now();
            if (now - lastAlertTime.memory > ALERT_COOLDOWN) {
                const msg = `🚨 *High Memory Usage Alert* on Primary Server\nUsage: ${memUsagePercent.toFixed(1)}%`;
                console.log(msg);
                sendAlert(msg).catch(console.error);
                lastAlertTime.memory = now;
            }
        }

        // Check Disk
        for (const disk of fsSize) {
            if (disk.use > DISK_THRESHOLD_PERCENT) {
                const now = Date.now();
                if (now - lastAlertTime.disk > ALERT_COOLDOWN) {
                    const msg = `🚨 *High Disk Usage Alert* on Primary Server\nMount: ${disk.mount}\nUsage: ${disk.use}%`;
                    console.log(msg);
                    sendAlert(msg).catch(console.error);
                    lastAlertTime.disk = now;
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error in monitoring loop:', error);
    }
};

setInterval(monitorSystem, MONITOR_INTERVAL);

// System Availability Monitoring
const pool = require('./db');
const monitor = require('./monitor');

// Start monitoring
monitor.startMonitoring(pool);

// Send startup alert
sendAlert('✅ *Server Started*: Primary Server is now online.').catch(console.error);

// Graceful Shutdown
const handleShutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down...`);
    try {
        await sendAlert(`🛑 *Server Stopping*: Primary Server is going offline (${signal}).`);
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
