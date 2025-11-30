require('dotenv').config();
const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// WAN IP & Interface Caching
let cachedWanIp = null;
let cachedInterfaces = null;
let lastWanIpCheck = 0;
let lastInterfaceCheck = 0;
const CACHE_DURATION = 3600000; // 1 hour

const getPublicIp = async () => {
    const now = Date.now();
    if (cachedWanIp && (now - lastWanIpCheck < CACHE_DURATION)) {
        return cachedWanIp;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            cachedWanIp = data.ip;
            lastWanIpCheck = now;
            return cachedWanIp;
        }
    } catch (error) {
        console.error('Failed to fetch WAN IP:', error.message);
    }
    return cachedWanIp || 'Unknown';
};

const getNetworkInterfaces = async () => {
    const now = Date.now();
    if (cachedInterfaces && (now - lastInterfaceCheck < CACHE_DURATION)) {
        return cachedInterfaces;
    }
    try {
        cachedInterfaces = await si.networkInterfaces();
        lastInterfaceCheck = now;
        return cachedInterfaces;
    } catch (error) {
        console.error('Failed to fetch network interfaces:', error);
        return [];
    }
};

// Cache static data to reduce load time
let staticData = {
    os: null,
    cpu: null,
    system: null,
    disk: []
};

// Initialize static data
const initStaticData = async () => {
    try {
        const [os, cpu, system] = await Promise.all([
            si.osInfo(),
            si.cpu(),
            si.system()
        ]);
        staticData.os = {
            platform: os.platform,
            distro: os.distro,
            release: os.release,
            hostname: os.hostname,
            arch: os.arch
        };
        staticData.cpu = {
            manufacturer: cpu.manufacturer,
            brand: cpu.brand,
            cores: cpu.cores,
            speed: cpu.speed
        };
        staticData.system = {
            manufacturer: system.manufacturer,
            model: system.model
        };
        console.log('Static system data cached');
    } catch (error) {
        console.error('Failed to cache static data:', error);
    }
};

// Update disk stats periodically (every 5 minutes)
const updateDiskStats = async () => {
    try {
        const fsSize = await si.fsSize();
        console.log('Raw fsSize:', fsSize); // Debug log
        if (fsSize && fsSize.length > 0) {
            staticData.disk = fsSize.map(disk => ({
                fs: disk.fs,
                type: disk.type,
                size: disk.size,
                used: disk.used,
                use: disk.use,
                mount: disk.mount
            }));
            console.log(`Disk stats updated: ${fsSize.length} disks found`);
        } else {
            console.warn('Disk stats updated but no disks found!');
        }
    } catch (error) {
        console.error('Failed to update disk stats:', error);
    }
};

initStaticData();
updateDiskStats();
setInterval(updateDiskStats, 300000); // 5 minutes

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

        const [currentLoad, mem, networkStats, networkInterfaces, wanIp] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats(),
            getNetworkInterfaces(),
            getPublicIp()
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
            interfaces: networkInterfaces,
            wanIp: wanIp,
            disk: staticData.disk || [],
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

app.get('/api/resources', authenticateToken, async (req, res) => {
    try {
        const [processes, docker] = await Promise.all([
            si.processes(),
            si.dockerContainers().catch(() => []) // Handle case where Docker is not running
        ]);

        // Format processes to match frontend expectation
        const formattedProcesses = processes.list
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 10)
            .map(p => ({
                pid: p.pid,
                name: p.name,
                user: p.user,
                cpu: p.cpu,
                mem: p.mem
            }));

        // Format docker containers
        const formattedDocker = docker.map(c => ({
            name: c.name,
            image: c.image,
            state: c.state,
            status: c.status
        }));

        res.json({
            processes: formattedProcesses,
            docker: formattedDocker
        });
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

app.get('/api/security', authenticateToken, async (req, res) => {
    try {
        const [users, connections] = await Promise.all([
            si.users(),
            si.networkConnections().catch(() => []) // Handle potential permission issues
        ]);

        res.json({
            users: users.map(u => ({
                user: u.user,
                tty: u.tty,
                date: u.date,
                ip: u.ip
            })),
            connections: connections.map(conn => ({
                protocol: conn.protocol,
                localAddress: conn.localAddress,
                localPort: conn.localPort,
                peerAddress: conn.peerAddress,
                peerPort: conn.peerPort,
                state: conn.state,
                process: conn.process
            })),
            authLogs: [] // Windows event logs are complex to parse, returning empty for now
        });
    } catch (error) {
        console.error('Error fetching security info:', error);
        res.status(500).json({ error: 'Failed to fetch security info' });
    }
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`Remote Agent running on port ${PORT}`);
});
