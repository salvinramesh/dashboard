console.log('DEBUG: Agent script starting...');
console.log('VERSION: 2.0.0-FALLBACK-TEST');
const path = require('path');
require('dotenv').config({ path: path.join(path.dirname(process.execPath), '.env') });
const express = require('express');
const si = require('systeminformation');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');

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
        const exePath = process.execPath; // Path to the executable
        const scriptDir = path.dirname(exePath);
        const vbsPath = path.join(scriptDir, 'run-hidden.vbs');
        const shortcutPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'ActionFi Agent.lnk');

        // 1. Create VBScript
        const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "${scriptDir}"
WshShell.Run chr(34) & "${exePath}" & chr(34), 0
Set WshShell = Nothing`;
        fs.writeFileSync(vbsPath, vbsContent);
        console.log(`Created hidden launcher: ${vbsPath}`);

        // 2. Create Shortcut using PowerShell
        const psCommand = `$s=(New-Object -COM WScript.Shell).CreateShortcut('${shortcutPath}');$s.TargetPath='${vbsPath}';$s.WorkingDirectory='${scriptDir}';$s.Description='ActionFi Remote Agent';$s.Save()`;
        execSync(`powershell -Command "${psCommand}"`);
        console.log(`Created startup shortcut: ${shortcutPath}`);

        console.log('Installation successful! The agent will start automatically on login.');
        waitAndExit(0);
    } catch (err) {
        console.error('Installation failed:', err);
        waitAndExit(1);
    }
};

const handleUninstall = () => {
    try {
        console.log('Uninstalling agent...');
        const exePath = process.execPath;
        const scriptDir = path.dirname(exePath);
        const vbsPath = path.join(scriptDir, 'run-hidden.vbs');
        const shortcutPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'ActionFi Agent.lnk');

        if (fs.existsSync(shortcutPath)) {
            fs.unlinkSync(shortcutPath);
            console.log('Removed startup shortcut.');
        }
        if (fs.existsSync(vbsPath)) {
            fs.unlinkSync(vbsPath);
            console.log('Removed hidden launcher.');
        }
        console.log('Uninstallation successful.');
        waitAndExit(0);
    } catch (err) {
        console.error('Uninstallation failed:', err);
        waitAndExit(1);
    }
};



// Prevent instant close on error
const waitAndExit = (code = 1) => {
    // If running in automated mode (install/uninstall), exit immediately
    if (process.argv.includes('--install') || process.argv.includes('--uninstall')) {
        process.exit(code);
    }

    console.log('\nPress any key to exit...');
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on('data', () => process.exit(code));
};

process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR:', err);
    waitAndExit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    waitAndExit(1);
});

// --- Main Server Logic ---
const startServer = () => {
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


    // Process Management Endpoints
    app.post('/api/processes/:pid/kill', authenticateToken, (req, res) => {
        const pid = parseInt(req.params.pid);

        try {
            process.kill(pid, 'SIGKILL'); // Force kill
            res.json({ status: 'success', message: `Process ${pid} killed` });
        } catch (e) {
            console.error(`Failed to kill process ${pid}:`, e);
            // Fallback for Windows or permission issues
            const isWin = os.platform() === 'win32';
            const cmd = isWin ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;

            const { exec } = require('child_process');
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Fallback kill failed for ${pid}:`, stderr || error.message);
                    return res.status(500).json({ error: `Failed to kill process ${pid}` });
                }
                res.json({ status: 'success', message: `Process ${pid} killed (fallback)` });
            });
        }
    });


    // Service Management Endpoints
    app.get('/api/services', authenticateToken, async (req, res) => {
        try {
            const isWin = os.platform() === 'win32';
            const cmd = isWin
                ? 'powershell "Get-Service | Select-Object Name, DisplayName, Status, StartType | ConvertTo-Json"'
                : 'systemctl list-units --type=service --all --no-pager --no-legend --output=json'; // JSON output requires newer systemd, fallback to parsing text if needed

            // Fallback for older systemd that doesn't support json output
            const linuxCmd = 'systemctl list-units --type=service --all --no-pager --no-legend';

            const { exec } = require('child_process');

            exec(isWin ? cmd : linuxCmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('Failed to list services:', error);
                    return res.status(500).json({ error: 'Failed to list services' });
                }

                let services = [];
                if (isWin) {
                    try {
                        services = JSON.parse(stdout).map(s => ({
                            name: s.Name,
                            displayName: s.DisplayName,
                            status: s.Status === 4 ? 'running' : 'stopped', // 4 is Running in PowerShell enum
                            startType: s.StartType
                        }));
                    } catch (e) {
                        console.error('Failed to parse Windows services:', e);
                        return res.status(500).json({ error: 'Failed to parse services' });
                    }
                } else {
                    // Parse Linux text output
                    // Format: unit load active sub description
                    services = stdout.split('\n').filter(line => line.trim()).map(line => {
                        const parts = line.trim().split(/\s+/);
                        return {
                            name: parts[0],
                            displayName: parts.slice(4).join(' '),
                            status: parts[2] === 'active' ? 'running' : 'stopped',
                            subState: parts[3]
                        };
                    });
                }

                res.json(services);
            });
        } catch (error) {
            console.error('Error fetching services:', error);
            res.status(500).json({ error: 'Failed to fetch services' });
        }
    });

    app.post('/api/services/:name/:action', authenticateToken, async (req, res) => {
        const { name, action } = req.params;
        if (!['start', 'stop', 'restart'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const isWin = os.platform() === 'win32';
        let cmd;

        if (isWin) {
            const psAction = action === 'start' ? 'Start-Service' : action === 'stop' ? 'Stop-Service' : 'Restart-Service';
            cmd = `powershell "${psAction} -Name '${name}' -Force -ErrorAction Stop"`;
        } else {
            cmd = `systemctl ${action} ${name}`;
        }

        const { exec } = require('child_process');
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to ${action} service ${name}:`, stderr || error.message);
                return res.status(500).json({ error: `Failed to ${action} service` });
            }
            res.json({ status: 'success', message: `Service ${name} ${action}ed` });
        });
    });



    // Docker Management Endpoints
    app.post('/api/docker/:id/:action', authenticateToken, async (req, res) => {
        const { id, action } = req.params;
        if (!['start', 'stop', 'restart'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const cmd = `docker ${action} ${id}`;
        const { exec } = require('child_process');

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to ${action} container ${id}:`, stderr || error.message);
                return res.status(500).json({ error: `Failed to ${action} container` });
            }
            res.json({ status: 'success', message: `Container ${id} ${action}ed` });
        });
    });



    // File Management Endpoints
    app.get('/api/files/list', authenticateToken, async (req, res) => {
        const dirPath = req.query.path || (os.platform() === 'win32' ? 'C:\\' : '/');

        try {
            const fs = require('fs');
            const path = require('path');

            if (!fs.existsSync(dirPath)) {
                return res.status(404).json({ error: 'Path not found' });
            }

            const items = fs.readdirSync(dirPath, { withFileTypes: true });
            const fileList = items.map(item => {
                try {
                    const stats = fs.statSync(path.join(dirPath, item.name));
                    return {
                        name: item.name,
                        isDirectory: item.isDirectory(),
                        size: stats.size,
                        modified: stats.mtime
                    };
                } catch (e) {
                    return null; // Skip files we can't read
                }
            }).filter(Boolean)
                .sort((a, b) => {
                    // Directories first, then files
                    if (a.isDirectory === b.isDirectory) {
                        return a.name.localeCompare(b.name);
                    }
                    return a.isDirectory ? -1 : 1;
                });

            res.json({
                path: dirPath,
                items: fileList
            });
        } catch (error) {
            console.error('Failed to list files:', error);
            res.status(500).json({ error: 'Failed to list files: ' + error.message });
        }
    });

    app.get('/api/files/download', authenticateToken, (req, res) => {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ error: 'Path is required' });
        }

        try {
            const fs = require('fs');
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            res.download(filePath, (err) => {
                if (err) {
                    console.error('Error downloading file:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Failed to download file' });
                    }
                }
            });
        } catch (error) {
            console.error('Failed to download file:', error);
            res.status(500).json({ error: 'Failed to download file' });
        }
    });

    // Auto-Update Logic
    const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3006'; // Configure this in .env
    const CURRENT_VERSION = require('./package.json').version;
    const fs = require('fs');

    const checkForUpdates = async () => {
        try {
            console.log(`Checking for updates (Current: ${CURRENT_VERSION})...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${SERVER_URL}/api/agent/version`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const { version: remoteVersion } = await response.json();
                if (remoteVersion !== CURRENT_VERSION) {
                    console.log(`New version found: ${remoteVersion}. Downloading...`);

                    const downloadResponse = await fetch(`${SERVER_URL}/api/agent/download`);
                    if (downloadResponse.ok) {
                        const newCode = await downloadResponse.text();
                        fs.writeFileSync('index.js.new', newCode);

                        // Update package.json version
                        try {
                            const packageJsonPath = './package.json';
                            if (fs.existsSync(packageJsonPath)) {
                                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                                packageJson.version = remoteVersion;
                                fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
                                console.log(`Updated package.json to version ${remoteVersion}`);
                            }
                        } catch (err) {
                            console.error('Failed to update package.json:', err);
                        }

                        // Atomic rename
                        fs.renameSync('index.js.new', 'index.js');

                        console.log('Update applied. Restarting...');
                        process.exit(0); // PM2/Service should restart
                    }
                } else {
                    console.log('Agent is up to date.');
                }
            }
        } catch (error) {
            console.error('Update check failed:', error.message);
        }
    };

    // Check on startup and every hour
    checkForUpdates();
    setInterval(checkForUpdates, 3600000);

    // Health check endpoint (no auth required)
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', uptime: process.uptime(), version: CURRENT_VERSION });
    });

    // ... (previous code)

    const http = require('http');
    const { Server } = require('socket.io');
    const { spawn } = require('child_process');
    const os = require('os');

    let pty = null;
    try {
        pty = require('node-pty');
    } catch (e) {
        console.warn('node-pty failed to load:', e);
        console.warn('Node version:', process.version);
    }

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: '*', // Allow connection from Dashboard Server
            methods: ['GET', 'POST']
        }
    });

    // Terminal Socket Logic
    io.on('connection', (socket) => {
        console.log('New socket connection:', socket.id);
        let term = null;

        socket.on('start-terminal', (data) => {
            console.log('DEBUG: start-terminal requested');
            // Verify token (simplified for socket)
            const token = data?.token;
            if (!token) {
                socket.emit('error', 'Authentication required');
                return;
            }

            try {
                jwt.verify(token, JWT_SECRET);
            } catch (err) {
                socket.emit('error', 'Invalid token');
                return;
            }

            const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

            // Force fallback if running in pkg (node-pty doesn't work well in pkg)
            if (pty && !process.pkg) {
                try {
                    term = pty.spawn(shell, [], {
                        name: 'xterm-color',
                        cols: 80,
                        rows: 24,
                        cwd: process.env.HOME || process.cwd(),
                        env: process.env
                    });

                    console.log(`Spawned terminal ${term.pid} (PTY)`);

                    term.on('data', (data) => {
                        socket.emit('output', data);
                    });

                    term.on('exit', (code) => {
                        console.log(`Terminal ${term?.pid} exited with code ${code}`);
                        socket.emit('exit', code);
                    });
                } catch (err) {
                    console.error('Failed to spawn PTY terminal:', err);
                    socket.emit('error', 'Failed to spawn terminal');
                }
            } else {
                // Fallback to child_process.spawn
                console.log('Using child_process.spawn for terminal (no PTY)');
                try {
                    term = spawn(shell, [], {
                        cwd: process.env.HOME || process.cwd(),
                        env: process.env,
                        shell: true
                    });

                    term.stdout.on('data', (data) => {
                        socket.emit('output', data.toString());
                    });

                    term.stderr.on('data', (data) => {
                        socket.emit('output', data.toString());
                    });

                    term.on('close', (code) => {
                        console.log(`Terminal process exited with code ${code}`);
                        socket.emit('exit', code);
                    });

                    // Add a write method to the term object for compatibility
                    term.write = (data) => {
                        term.stdin.write(data);
                    };

                    term.resize = () => { }; // No-op for spawn
                    term.kill = () => term.kill();

                } catch (err) {
                    console.error('Failed to spawn fallback terminal:', err);
                    socket.emit('error', 'Failed to spawn terminal');
                }
            }
        });

        socket.on('input', (data) => {
            if (term) {
                term.write(data);
            }
        });

        socket.on('resize', (size) => {
            if (term) {
                term.resize(size.cols, size.rows);
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id);
            if (term) {
                term.kill();
            }
            if (logProcess) {
                logProcess.kill();
            }
        });

        // Log Viewer Logic
        let logProcess = null;

        socket.on('watch-log', (data) => {
            const { path } = data;
            if (!path) return;

            console.log(`Starting log watch for: ${path}`);

            // Kill existing process if any
            if (logProcess) {
                try {
                    logProcess.kill();
                } catch (e) { }
            }

            const isWin = os.platform() === 'win32';
            const cmd = isWin ? 'powershell.exe' : 'tail';
            const args = isWin ? ['-Command', `Get-Content -Path "${path}" -Wait -Tail 20`] : ['-f', '-n', '20', path];

            try {
                if (pty) {
                    // Use PTY if available (better for buffering)
                    logProcess = pty.spawn(cmd, args, {
                        name: 'xterm-color',
                        cols: 200,
                        rows: 30,
                        cwd: process.env.HOME || process.cwd(),
                        env: process.env
                    });

                    logProcess.on('data', (data) => {
                        socket.emit('log-output', data);
                    });

                    logProcess.on('exit', (code) => {
                        console.log(`Log process exited with code ${code}`);
                        socket.emit('log-exit', code);
                    });
                } else {
                    // Fallback to child_process.spawn
                    console.log('Using child_process.spawn for logs (no PTY)');
                    logProcess = spawn(cmd, args);

                    logProcess.stdout.on('data', (data) => {
                        socket.emit('log-output', data.toString());
                    });

                    logProcess.stderr.on('data', (data) => {
                        socket.emit('log-output', data.toString());
                    });

                    logProcess.on('close', (code) => {
                        console.log(`Log process exited with code ${code}`);
                        socket.emit('log-exit', code);
                    });
                }
            } catch (err) {
                console.error('Failed to spawn log process:', err);
                socket.emit('log-error', `Failed to open log: ${err.message}`);
            }
        });

        socket.on('stop-log', () => {
            if (logProcess) {
                console.log('Stopping log watch');
                logProcess.kill();
                logProcess = null;
            }
        });
    });

    server.listen(PORT, () => {
        console.log(`Remote Agent running on port ${PORT}`);
        console.log(`- ID: ${process.env.AGENT_ID || 'Not set'}`);
        console.log(`- Name: ${process.env.AGENT_NAME || 'Not set'}`);
        console.log(`- Server: ${process.env.DASHBOARD_URL || 'Not set'}`);
    });
};

// Check CLI Arguments
if (process.argv.includes('--install')) {
    handleInstall();
} else if (process.argv.includes('--uninstall')) {
    handleUninstall();
} else {
    startServer();
}
