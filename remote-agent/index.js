console.log('DEBUG: Agent script starting...');
console.log('VERSION: 3.0.0-PUSH-ARCH');
const path = require('path');
const envPath = process.pkg
    ? path.join(path.dirname(process.execPath), '.env')
    : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });
const express = require('express');
const si = require('systeminformation');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const io = require('socket.io-client');
const os = require('os');

// --- Configuration ---
const AGENT_ID = process.env.AGENT_ID;
const AGENT_NAME = process.env.AGENT_NAME || os.hostname();
const DASHBOARD_URL = process.env.DASHBOARD_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3002; // Keep for local health check

if (!AGENT_ID || !DASHBOARD_URL || !JWT_SECRET) {
    console.error('Missing required environment variables: AGENT_ID, DASHBOARD_URL, JWT_SECRET');
    process.exit(1);
}

// --- Logging Setup ---
const logFile = path.join(process.cwd(), 'agent.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

const timestamp = () => new Date().toISOString();

console.log = (...args) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    logStream.write(`[${timestamp()}] [INFO] ${msg}\n`);
    originalConsoleLog(...args);
};

console.error = (...args) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    logStream.write(`[${timestamp()}] [ERROR] ${msg}\n`);
    originalConsoleError(...args);
};

// --- Installation Logic ---
const handleInstall = () => {
    try {
        console.log('Installing agent to startup...');
        const exePath = process.execPath;
        const scriptDir = path.dirname(exePath);
        const vbsPath = path.join(scriptDir, 'run-hidden.vbs');
        const shortcutPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'ActionFi Agent.lnk');

        const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "${scriptDir}"
WshShell.Run chr(34) & "${exePath}" & chr(34), 0
Set WshShell = Nothing`;
        fs.writeFileSync(vbsPath, vbsContent);
        console.log(`Created hidden launcher: ${vbsPath}`);

        const psCommand = `$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut("${shortcutPath}"); $Shortcut.TargetPath = "${vbsPath}"; $Shortcut.Save()`;
        execSync(`powershell -Command "${psCommand}"`);
        console.log(`Created startup shortcut: ${shortcutPath}`);

        console.log('Installation complete.');
    } catch (error) {
        console.error('Installation failed:', error.message);
        process.exit(1);
    }
};

const handleUninstall = () => {
    try {
        console.log('Uninstalling agent...');
        const shortcutPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'ActionFi Agent.lnk');
        if (fs.existsSync(shortcutPath)) {
            fs.unlinkSync(shortcutPath);
            console.log('Removed startup shortcut.');
        }
        console.log('Uninstallation complete.');
    } catch (error) {
        console.error('Uninstallation failed:', error.message);
    }
};

if (process.argv.includes('--install')) {
    handleInstall();
    process.exit(0);
}

if (process.argv.includes('--uninstall')) {
    handleUninstall();
    process.exit(0);
}

// --- System Stats Cache ---
let cachedWanIp = null;
let lastWanIpCheck = 0;
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

// --- Socket Connection ---
console.log(`Connecting to Dashboard at ${DASHBOARD_URL}...`);

const socket = io(DASHBOARD_URL, {
    query: { type: 'agent' },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

socket.on('connect', () => {
    console.log('Connected to Dashboard');
    // Register
    const token = jwt.sign({ role: 'agent', id: AGENT_ID }, JWT_SECRET, { expiresIn: '1h' });
    socket.emit('register', { id: AGENT_ID, token });
});

socket.on('disconnect', () => {
    console.log('Disconnected from Dashboard');
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
});

socket.on('register-success', () => {
    console.log('Registration successful');
});

socket.on('register-error', (msg) => {
    console.error('Registration failed:', msg);
});

// --- Command Handling ---
socket.on('command', async ({ requestId, type, payload }) => {
    console.log(`Received command: ${type} (${requestId})`);

    try {
        let data = null;

        switch (type) {
            case 'get-stats':
                data = await getSystemStats();
                break;
            case 'get-resources':
                data = await getResources();
                break;
            case 'get-security':
                data = await getSecurity();
                break;
            case 'get-services':
                data = await getServices();
                break;
            case 'control-service':
                data = await controlService(payload.name, payload.action);
                break;
            case 'control-docker':
                data = await controlDocker(payload.containerId, payload.action);
                break;
            case 'list-files':
                data = await listFiles(payload.path);
                break;
            case 'download-file':
                data = await downloadFile(payload.path);
                break;
            case 'kill-process':
                data = await killProcess(payload.pid);
                break;
            default:
                throw new Error(`Unknown command: ${type}`);
        }

        socket.emit('command-response', { requestId, data });

    } catch (err) {
        console.error(`Error executing ${type}:`, err);
        socket.emit('command-response', { requestId, error: err.message });
    }
});

// --- Terminal Handling ---
let term = null;
let pty = null;
try {
    pty = require('node-pty');
} catch (e) {
    console.warn('node-pty failed to load (using fallback):', e.message);
}

socket.on('start-terminal', (data) => {
    console.log('Starting terminal session...');

    if (term) {
        try { term.kill(); } catch (e) { }
        term = null;
    }

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    // Force fallback if running in pkg
    if (pty && !process.pkg) {
        try {
            term = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: 80,
                rows: 24,
                cwd: process.env.HOME || process.cwd(),
                env: process.env
            });

            term.on('data', (data) => socket.emit('output', data));
            term.on('exit', (code) => socket.emit('exit', code));
        } catch (err) {
            console.error('Failed to spawn PTY:', err);
            socket.emit('error', 'Failed to spawn terminal: ' + err.message);
        }
    } else {
        // Fallback
        try {
            console.log(`Spawning fallback shell: ${shell}`);
            term = spawn(shell, [], {
                cwd: process.env.HOME || process.cwd(),
                env: process.env,
                shell: true
            });
            term.stdout.on('data', (data) => socket.emit('output', data.toString()));
            term.stderr.on('data', (data) => socket.emit('output', data.toString()));
            term.on('close', (code) => socket.emit('exit', code));
            term.on('error', (err) => {
                console.error('Terminal process error:', err);
                socket.emit('error', 'Terminal process error: ' + err.message);
            });

            term.write = (data) => { if (term && term.stdin) term.stdin.write(data); };
            term.resize = () => { };
            term.kill = () => term.kill();
        } catch (err) {
            console.error('Failed to spawn fallback terminal:', err);
            socket.emit('error', 'Failed to spawn terminal: ' + err.message);
        }
    }
});

socket.on('input', (data) => {
    if (term) term.write(data);
});

socket.on('resize', (size) => {
    if (term && term.resize) term.resize(size.cols, size.rows);
});

// --- Helper Functions ---

const getSystemStats = async () => {
    const [currentLoad, mem, networkStats, osInfo, cpu, fsSize, uptime, wanIp] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats(),
        si.osInfo(),
        si.cpu(),
        si.fsSize(),
        si.time(),
        getPublicIp()
    ]);

    return {
        cpu: {
            load: currentLoad.currentLoad,
            cores: cpu.cores,
            brand: cpu.brand
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
        wanIp,
        os: {
            platform: osInfo.platform,
            distro: osInfo.distro,
            release: osInfo.release,
            hostname: osInfo.hostname
        },
        uptime: uptime.uptime
    };
};

const getResources = async () => {
    const [processes, docker] = await Promise.all([
        si.processes(),
        si.dockerContainers()
    ]);
    return {
        processes: processes.list.slice(0, 20),
        docker
    };
};

const getSecurity = async () => {
    const [connections, users] = await Promise.all([
        si.networkConnections(),
        si.users()
    ]);
    return {
        connections: connections.filter(c => c.state === 'LISTEN' || c.state === 'ESTABLISHED'),
        users
    };
};

const getServices = async () => {
    const services = await si.services('*');
    return services.slice(0, 50); // Limit to 50
};

const controlService = async (name, action) => {
    // Implementation depends on OS. For Windows:
    const cmd = action === 'start' ? 'start-service' : 'stop-service';
    execSync(`powershell -Command "${cmd} '${name}'"`);
    return { success: true };
};

const controlDocker = async (containerId, action) => {
    const docker = await si.dockerContainers();
    const container = docker.find(c => c.id === containerId);
    if (!container) throw new Error('Container not found');

    // Use docker CLI
    execSync(`docker ${action} ${containerId}`);
    return { success: true };
};

const listFiles = async (dirPath) => {
    try {
        const targetPath = dirPath ? path.resolve(dirPath) : process.cwd();
        const files = fs.readdirSync(targetPath, { withFileTypes: true });
        const items = files.map(f => {
            try {
                const stats = fs.statSync(path.join(targetPath, f.name));
                return {
                    name: f.name,
                    isDirectory: f.isDirectory(),
                    size: f.isDirectory() ? 0 : stats.size,
                    modified: stats.mtime
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        return { items, path: targetPath };
    } catch (err) {
        console.error('Error listing files:', err);
        throw new Error(`Failed to list files: ${err.message}`);
    }
};

const downloadFile = async (filePath) => {
    try {
        const fullPath = path.resolve(filePath);
        // Check if file exists and is a file
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) {
            throw new Error('Not a file');
        }

        // Read file as buffer
        const content = fs.readFileSync(fullPath);
        // Return as base64 to ensure safe transport over JSON
        return {
            name: path.basename(fullPath),
            content: content.toString('base64'),
            mime: 'application/octet-stream' // Simplified
        };
    } catch (err) {
        console.error('Error downloading file:', err);
        throw new Error(`Failed to download file: ${err.message}`);
    }
};

const killProcess = async (pid) => {
    process.kill(pid);
    return { success: true };
};

// --- Local Health Check Server (Optional) ---
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok', version: '3.0.0' }));
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Local health check running on port ${PORT}`);
});
