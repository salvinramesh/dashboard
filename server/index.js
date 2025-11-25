const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const systemsRouter = require('./routes/systems');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Global request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Systems API routes
app.use('/api/systems', systemsRouter);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.get('/api/stats', async (req, res) => {
    try {
        const [cpu, mem, networkStats, osInfo, cpuInfo, fsSize] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats(),
            si.osInfo(),
            si.cpu(),
            si.fsSize()
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
            cpu: {
                load: cpu.currentLoad,
                cores: cpuInfo.cores, // or physicalCores
                brand: cpuInfo.brand
            },
            mem: {
                total: mem.total,
                used: mem.used,
                active: mem.active,
                available: mem.available
            },
            disk: fsSize, // Array of filesystems
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
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

// GET /api/resources - Get processes and docker info
app.get('/api/resources', async (req, res) => {
    try {
        const [processes, docker] = await Promise.all([
            si.processes(),
            si.dockerContainers()
        ]);

        res.json({
            processes: processes.list.slice(0, 20), // Top 20 processes
            docker: docker
        });
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

// GET /api/security - Get network connections and users
app.get('/api/security', async (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
