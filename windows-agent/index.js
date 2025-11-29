require('dotenv').config();
const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors());
app.use(express.json());

// Cache static data to reduce load time
let staticData = {
    os: null,
    cpu: null,
    system: null
};

// Initialize static data
const initStaticData = async () => {
    try {
        const [os, cpu, system] = await Promise.all([
            si.osInfo(),
            si.cpu(),
            si.system()
        ]);
        staticData = {
            os: {
                platform: os.platform,
                distro: os.distro,
                release: os.release,
                hostname: os.hostname,
                arch: os.arch
            },
            cpu: {
                manufacturer: cpu.manufacturer,
                brand: cpu.brand,
                cores: cpu.cores,
                speed: cpu.speed
            },
            system: {
                manufacturer: system.manufacturer,
                model: system.model
            }
        };
        console.log('Static system data cached');
    } catch (error) {
        console.error('Failed to cache static data:', error);
    }
};

initStaticData();

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        // Fetch dynamic data only
        // Optimized for Windows: avoid slow calls like fsSize if possible or cache them if needed
        // For now, we fetch basic dynamic stats which should be fast enough

        const [currentLoad, mem, networkStats, fsSize] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats(),
            si.fsSize()
        ]);

        res.json({
            cpu: {
                ...staticData.cpu,
                load: currentLoad.currentLoad,
                user: currentLoad.currentLoadUser,
                sys: currentLoad.currentLoadSystem
            },
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
                tx_bytes: iface.tx_bytes,
                operstate: iface.operstate
            })),
            disk: fsSize.map(disk => ({
                fs: disk.fs,
                type: disk.type,
                size: disk.size,
                used: disk.used,
                use: disk.use,
                mount: disk.mount
            })),
            os: staticData.os,
            system: staticData.system,
            uptime: si.time().uptime,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`Windows Agent running on port ${PORT}`);
});
