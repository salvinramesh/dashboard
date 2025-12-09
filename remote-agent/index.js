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
const { execSync, spawn, exec } = require('child_process');
const io = require('socket.io-client');
const os = require('os');
// const screenshot = require('screenshot-desktop'); // Removed for Windows build compatibility

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
        console.log('Installing agent to startup (Registry)...');
        const exePath = process.execPath;
        const scriptDir = path.dirname(exePath);
        const vbsPath = path.join(scriptDir, 'run-hidden.vbs');

        // Ensure VBS exists (redundant but safe)
        const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
WScript.Sleep 30000 ' Wait 30 seconds for network
WshShell.CurrentDirectory = "${scriptDir}"
WshShell.Run chr(34) & "${exePath}" & chr(34), 0
Set WshShell = Nothing`;
        fs.writeFileSync(vbsPath, vbsContent);
        console.log(`Verified helper script: ${vbsPath}`);

        // Use Task Scheduler for startup: Run at Logon with Highest Privileges
        // Use wscript to run the VBS (which handles delay and hiding)
        const taskCmd = `schtasks /create /tn "ActionFiAgent" /tr "wscript.exe \\"${vbsPath}\\"" /sc onlogon /rl highest /f`;
        execSync(taskCmd);

        console.log('Created Scheduled Task: ActionFiAgent (Invisible + Delayed Start)');

        console.log('Added Registry Run key for ActionFiAgent.');
        console.log('Installation complete.');
    } catch (error) {
        console.error('Installation failed:', error.message);
        process.exit(1);
    }
};

const handleUninstall = () => {
    try {
        console.log('Uninstalling agent...');

        // Remove Registry Key
        // Remove Scheduled Task
        try {
            execSync('schtasks /delete /tn "ActionFiAgent" /f');
            console.log('Removed ActionFiAgent task.');
        } catch (e) {
            console.log('Task not found or already removed.');
        }

        // Cleanup Legacy Registry Key (just in case)
        const cmd = `Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'ActionFiAgent' -ErrorAction SilentlyContinue`;
        try {
            execSync(`powershell -Command "${cmd}"`);
            console.log('Checked/Removed legacy Registry Run key.');
        } catch (e) { /* ignore */ }

        // Cleanup Shortcut if it exists (legacy)
        const shortcutPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'ActionFi Agent.lnk');
        if (fs.existsSync(shortcutPath)) {
            fs.unlinkSync(shortcutPath);
            console.log('Removed legacy startup shortcut.');
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

// Remote Desktop Logic
let screenInterval = null;

const captureScreenWindows = async () => {
    const tempFile = path.join(os.tmpdir(), `screen-${Date.now()}.jpg`);
    const psScript = `
$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $Width = 0
    $Height = 0

    # 1. Try WMI for physical resolution (handles DPI)
    try {
        $Video = Get-CimInstance -ClassName Win32_VideoController -ErrorAction Stop | Select-Object -First 1
        if ($Video) {
            $Width = [int]$Video.CurrentHorizontalResolution
            $Height = [int]$Video.CurrentVerticalResolution
            Write-Host "Got resolution from WMI: $Width x $Height"
        }
    } catch {
        Write-Host "WMI detection failed."
    }

    # 2. Fallback to PrimaryScreen (System.Windows.Forms)
    if ($Width -le 0 -or $Height -le 0) {
        try {
            $Screen = [System.Windows.Forms.Screen]::PrimaryScreen
            $Width = [int]$Screen.Bounds.Width
            $Height = [int]$Screen.Bounds.Height
            Write-Host "Got resolution from PrimaryScreen: $Width x $Height"
        } catch {
            Write-Host "PrimaryScreen detection failed."
        }
    }

    # 3. Final Fallback (Safe Default)
    if ($Width -le 0 -or $Height -le 0) {
        $Width = 1920
        $Height = 1080
        Write-Host "Using default fallback resolution: $Width x $Height"
    }

    # Ensure strictly integer types for Bitmap constructor
    $Width = [int]$Width
    $Height = [int]$Height

    $Bitmap = New-Object System.Drawing.Bitmap $Width, $Height
    $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
    $Graphics.CopyFromScreen(0, 0, 0, 0, $Bitmap.Size)
    $Bitmap.Save("${tempFile}", [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $Graphics.Dispose()
    $Bitmap.Dispose()
} catch {
    $ErrMessage = $_.Exception.Message
    Write-Error "Failed to capture. Width: $Width, Height: $Height. Error: $ErrMessage"
    exit 1
}
`;
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(os.tmpdir(), `capture-${Date.now()}.ps1`);
        try {
            fs.writeFileSync(scriptPath, psScript);
        } catch (writeErr) {
            console.error('[Capture Debug] Failed to write script:', writeErr);
            return reject(writeErr);
        }

        console.log('[Capture Debug] Spawning PowerShell...');
        const child = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath]);

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            // Always cleanup script
            try { fs.unlinkSync(scriptPath); } catch (e) { }

            if (code !== 0) {
                console.error('[Capture Debug] PowerShell exited with code:', code);
                console.error('[Capture Debug] Stderr:', stderr);
                // Include stdout in error message for better context
                reject(new Error(`PowerShell exited with code ${code}. Stdout: ${stdout.trim()}. Stderr: ${stderr}`));
                return;
            }

            if (fs.existsSync(tempFile)) {
                try {
                    const imgBuffer = fs.readFileSync(tempFile);
                    fs.unlinkSync(tempFile);
                    console.log('[Capture Debug] Screenshot captured successfully');
                    resolve(imgBuffer);
                } catch (readErr) {
                    console.error('[Capture Debug] Failed to read screenshot:', readErr);
                    reject(readErr);
                }
            } else {
                console.error('[Capture Debug] No file created. Stdout:', stdout);
                reject(new Error('Screenshot file not created'));
            }
        });

        child.on('error', (err) => {
            console.error('[Capture Debug] Failed to spawn process:', err);
            reject(err);
        });
    });
};

// --- Input Worker ---
let inputWorker = null;
let linuxWidth = 1920;
let linuxHeight = 1080;

const startInputWorker = async () => {
    if (inputWorker) return;

    if (process.platform !== 'win32') {
        // Linux Input Initialization
        if (process.platform === 'linux') {
            try {
                // Determine resolution for coordinate mapping
                const si = require('systeminformation');
                const graphics = await si.graphics();
                if (graphics.displays && graphics.displays.length > 0) {
                    linuxWidth = graphics.displays[0].currentResX || graphics.displays[0].resolutionX || 1920;
                    linuxHeight = graphics.displays[0].currentResY || graphics.displays[0].resolutionY || 1080;
                }
                console.log(`Linux Input: Resolution detected as ${linuxWidth}x${linuxHeight}`);
            } catch (e) {
                console.error('Failed to detect resolution:', e.message);
            }
        }
        return;
    }

    // Windows implementation
    const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $source = @"
    using System;
    using System.Runtime.InteropServices;
    using System.Windows.Forms;

    public class Input {
        [DllImport("user32.dll")]
        public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    private const int MOUSEEVENTF_LEFTDOWN = 0x02;
    private const int MOUSEEVENTF_LEFTUP = 0x04;
    private const int MOUSEEVENTF_RIGHTDOWN = 0x08;
    private const int MOUSEEVENTF_RIGHTUP = 0x10;
    private const int MOUSEEVENTF_MIDDLEDOWN = 0x20;
    private const int MOUSEEVENTF_MIDDLEUP = 0x40;

    public static void MoveMouse(int x, int y) {
        SetCursorPos(x, y);
    }

    public static void Click(string button, bool down) {
        int flags = 0;
        if (button == "left") flags = down ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP;
        if (button == "right") flags = down ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_RIGHTUP;
        if (button == "middle") flags = down ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_MIDDLEUP;
        mouse_event(flags, 0, 0, 0, 0);
    }
    }
"@
    Add-Type -TypeDefinition $source -Language CSharp -ReferencedAssemblies System.Windows.Forms, System.Drawing

    # Get physical resolution using WMI to handle DPI scaling
    $Video = Get-CimInstance -ClassName Win32_VideoController | Select-Object -First 1
    $Width = $Video.CurrentHorizontalResolution
    $Height = $Video.CurrentVerticalResolution

    # Fallback if WMI fails
    if (!$Width -or !$Height) {
        $Screen = [System.Windows.Forms.Screen]::PrimaryScreen
        $Width = $Screen.Bounds.Width
        $Height = $Screen.Bounds.Height
    }

    Write-Host "READY"

    while ($true) {
        $line = [Console]::In.ReadLine()
        if ($line -eq $null) { break }
        Write-Host "DEBUG: Received '$line'"
        try {
            $parts = $line.Split(' ')
            $cmd = $parts[0]

            if ($cmd -eq "MOVE") {
                $x = [int]([float]$parts[1] * $Width)
                $y = [int]([float]$parts[2] * $Height)
                [Input]::MoveMouse($x, $y)
            } elseif ($cmd -eq "DOWN") {
                [Input]::Click($parts[1], $true)
            } elseif ($cmd -eq "UP") {
                [Input]::Click($parts[1], $false)
            } elseif ($cmd -eq "KEY") {
                $key = $line.Substring(4)
                [System.Windows.Forms.SendKeys]::SendWait($key)
            }
        } catch {
            Write-Error $_
        }
    }
`;
    try {
        const scriptPath = path.join(os.tmpdir(), 'input-worker.ps1');
        fs.writeFileSync(scriptPath, psScript);

        console.log('Spawning input worker from:', scriptPath);
        inputWorker = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        inputWorker.stdout.on('data', (data) => {
            console.log('Input worker stdout:', data.toString());
            // socket.emit('debug-log', `Input Worker: ${ data.toString() } `);
        });

        inputWorker.stderr.on('data', (data) => {
            console.error('Input worker stderr:', data.toString());
            socket.emit('debug-log', `Input Worker Error: ${data.toString()} `);
        });

        inputWorker.on('error', (err) => {
            console.error('Input worker error:', err);
            socket.emit('debug-log', `Input Worker Process Error: ${err.message} `);
            inputWorker = null;
        });

        inputWorker.on('exit', (code) => {
            console.log('Input worker exited with code:', code);
            inputWorker = null;
        });

        console.log('Input worker started');
    } catch (err) {
        console.error('Failed to start input worker:', err);
        socket.emit('debug-log', `Failed to start input worker: ${err.message} `);
    }
};

const stopInputWorker = () => {
    if (inputWorker) {
        inputWorker.kill();
        inputWorker = null;
        console.log('Input worker stopped');
    }
};

socket.on('desktop-input', (data) => {
    handleInput(data);
});

const handleInput = (data) => {
    // Linux Input Handling
    if (process.platform === 'linux') {
        try {
            // Throttling could be added here if needed
            if (data.type === 'mousemove') {
                const x = Math.round(data.x * linuxWidth);
                const y = Math.round(data.y * linuxHeight);
                spawn('ydotool', ['mousemove', x.toString(), y.toString()]);
            } else if (data.type === 'mousedown') {
                // Map button: 0=left(1), 2=right(2), 1=middle(3)
                let btn = 1;
                if (data.button === 2) btn = 2; // Right
                if (data.button === 1) btn = 3; // Middle
                spawn('ydotool', ['click', btn.toString()]);
            } else if (data.type === 'keydown') {
                let key = data.key;
                // Map special keys
                const map = {
                    'Enter': '1c', // 28
                    'Backspace': '0e',
                    'Tab': '0f',
                    'Escape': '01',
                    'ArrowUp': '67',
                    'ArrowDown': '6c',
                    'ArrowLeft': '69',
                    'ArrowRight': '6a',
                    'Delete': '6f',
                    'Home': '66',
                    'End': '6b',
                    'PageUp': '68',
                    'PageDown': '6d'
                };

                // ydotool standalone often requires key codes or specific names?
                // Help output showed "alt+r".
                // Let's try passing the key name directly first, but converting to lowercase might be safer for ydotool.

                if (map[data.key]) {
                    // Use hex/decimal codes if mapped?
                    // Actually ydotool key <key> often accepts code in hex/dec if keycodes are standard.
                    // But easier to use names if supported.
                    // Let's rely on names for now, falling back to key.
                    spawn('ydotool', ['key', data.key]); // Try raw name
                } else {
                    spawn('ydotool', ['key', key]);
                }
            }
        } catch (e) {
            console.error('Linux input error:', e.message);
        }
        return;
    }

    // Windows Handling
    if (!inputWorker || !inputWorker.stdin) return;

    try {
        if (data.type === 'mousemove') {
            inputWorker.stdin.write(`MOVE ${data.x} ${data.y} \r\n`);
        } else if (data.type === 'mousedown') {
            inputWorker.stdin.write(`DOWN ${data.button} \r\n`);
        } else if (data.type === 'mouseup') {
            inputWorker.stdin.write(`UP ${data.button} \r\n`);
        } else if (data.type === 'keydown') {
            // Simple mapping for now
            let key = data.key;
            if (key.length === 1) {
                // Character
                inputWorker.stdin.write(`KEY ${key} \r\n`);
            } else {
                // Special keys mapping for SendKeys
                const map = {
                    'Enter': '{ENTER}',
                    'Backspace': '{BS}',
                    'Tab': '{TAB}',
                    'Escape': '{ESC}',
                    'ArrowUp': '{UP}',
                    'ArrowDown': '{DOWN}',
                    'ArrowLeft': '{LEFT}',
                    'ArrowRight': '{RIGHT}',
                    'Delete': '{DEL}'
                };
                if (map[key]) {
                    inputWorker.stdin.write(`KEY ${map[key]} \r\n`);
                }
            }
        }
    } catch (err) {
        console.error('Failed to write to input worker:', err);
    }
};

const desktopLoop = async () => {
    try {
        let img;
        if (process.platform === 'win32') {
            img = await captureScreenWindows();
        } else if (process.platform === 'linux') {
            img = await captureScreenLinux();
        }

        if (img) {
            socket.emit('screen-frame', img.toString('base64'));
        }

        // Reset interval to fast speed if we recovered (and variable is accessible)
        if (screenInterval && screenInterval._repeat === 5000) {
            clearInterval(screenInterval);
            screenInterval = setInterval(desktopLoop, 1000);
        }
    } catch (err) {
        console.error('Screen capture failed:', err.message);
        if (err.message && err.message.includes('NO GUI')) {
            socket.emit('error', { message: 'NO GUI installed in that window' });
            clearInterval(screenInterval);
            screenInterval = setInterval(desktopLoop, 5000);
        } else {
            socket.emit('debug-log', `Agent: Screen capture failed: ${err.message} `);
        }
    }
};

socket.on('start-desktop', () => {
    console.log('Starting desktop stream...');
    socket.emit('debug-log', 'Agent: Received start-desktop command');

    if (screenInterval) clearInterval(screenInterval);

    // Start loop
    screenInterval = setInterval(desktopLoop, 1000);

    startInputWorker();
});

socket.on('stop-desktop', () => {
    console.log('Stopping desktop stream...');
    socket.emit('debug-log', 'Agent: Stopping desktop stream');
    if (screenInterval) {
        clearInterval(screenInterval);
        screenInterval = null;
    }
    stopInputWorker();
});

socket.on('desktop-input', (data) => {
    handleInput(data);
});

socket.on('disconnect', () => {
    if (screenInterval) {
        clearInterval(screenInterval);
        screenInterval = null;
    }
    stopInputWorker();
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
                throw new Error(`Unknown command: ${type} `);
        }

        socket.emit('command-response', { requestId, data });

    } catch (err) {
        console.error(`Error executing ${type}: `, err);
        socket.emit('command-response', { requestId, error: err.message });
    }
});

// --- Terminal Handling ---
let term = null;
let pty = null;
try {
    // pty = require('node-pty');
} catch (e) {
    console.warn('node-pty failed to load (using fallback):', e.message);
}

socket.on('start-terminal', (data) => {
    console.log('Starting terminal session...');

    console.log('[DEBUG] Received start-terminal command');
    if (term) {
        term.kill();
        term = null;
    }

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    console.log(`[DEBUG] Spawning shell: ${shell} `);

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
            console.log(`Spawning fallback shell: ${shell} `);
            term = spawn(shell, [], {
                cwd: process.env.HOME || process.cwd(),
                env: process.env,
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe'] // Explicitly define stdio
            });

            if (term.stdout) {
                term.stdout.on('data', (data) => socket.emit('output', data.toString()));
            }
            if (term.stderr) {
                term.stderr.on('data', (data) => socket.emit('output', data.toString()));
            }

            term.on('close', (code) => socket.emit('exit', code));
            term.on('error', (err) => {
                console.error('Terminal process error:', err);
                const errorDetails = JSON.stringify(err, Object.getOwnPropertyNames(err));
                socket.emit('error', 'Terminal process error: ' + errorDetails);
            });

            term.write = (data) => {
                if (term && term.stdin) {
                    try {
                        term.stdin.write(data);
                    } catch (e) {
                        console.error('Write to stdin failed:', e);
                    }
                }
            };
            term.resize = () => { };
            // term.kill is already defined on ChildProcess, no need to overwrite it
            // and definitely don't overwrite it with a recursive function!
        } catch (err) {
            console.error('Failed to spawn fallback terminal:', err);
            const errorDetails = JSON.stringify(err, Object.getOwnPropertyNames(err));
            socket.emit('error', 'Failed to spawn terminal: ' + errorDetails);
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

// Cache network interfaces to avoid heavy calls on every poll
let cachedInterfaces = null;
let lastInterfaceUpdate = 0;
const INTERFACE_CACHE_TTL = 300000; // 5 minutes

const getSystemStats = async () => {
    const now = Date.now();
    if (!cachedInterfaces || (now - lastInterfaceUpdate > INTERFACE_CACHE_TTL)) {
        try {
            // Use native os module instead of systeminformation for better performance/stability on Windows
            const interfaces = os.networkInterfaces();
            cachedInterfaces = [];

            for (const [name, ifaces] of Object.entries(interfaces)) {
                ifaces.forEach(iface => {
                    cachedInterfaces.push({
                        iface: name,
                        ip4: iface.family === 'IPv4' ? iface.address : '',
                        ip6: iface.family === 'IPv6' ? iface.address : '',
                        internal: iface.internal
                    });
                });
            }
            lastInterfaceUpdate = now;
        } catch (e) {
            console.error('Failed to get network interfaces:', e.message);
            if (!cachedInterfaces) cachedInterfaces = [];
        }
    }

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
        interfaces: cachedInterfaces,
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

    // Sort by CPU usage (descending), then Memory
    processes.list.sort((a, b) => b.cpu - a.cpu || b.mem - a.mem);

    return {
        processes: processes.list.slice(0, 50),
        docker
    };
};

const getWindowsNetworkConnections = () => {
    try {
        // Use single quotes for hashtable keys to avoid shell issues and force State to string
        const cmd = "Get-NetTCPConnection | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, @{Name='State';Expression={$_.State.ToString()}}, OwningProcess, @{Name='ProcessName';Expression={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}} | ConvertTo-Json -Depth 1";
        const output = execSync(`powershell -Command "${cmd}"`, { encoding: 'utf8' });
        if (!output.trim()) return [];

        let connections = JSON.parse(output);
        if (!Array.isArray(connections)) connections = [connections];

        return connections.map(c => ({
            protocol: 'tcp',
            localAddress: c.LocalAddress,
            localPort: c.LocalPort,
            peerAddress: c.RemoteAddress,
            peerPort: c.RemotePort,
            state: c.State,
            pid: c.OwningProcess,
            process: c.ProcessName || ''
        }));
    } catch (e) {
        console.error('Failed to get Windows network connections:', e.message);
        return [];
    }
};

const getSecurity = async () => {
    let connections = [];
    if (process.platform === 'win32') {
        connections = getWindowsNetworkConnections();
    } else {
        connections = await si.networkConnections();
    }

    const users = await si.users();

    return {
        connections: connections.filter(c => c.state === 'Listen' || c.state === 'Established' || c.state === 'LISTEN' || c.state === 'ESTABLISHED'),
        users
    };
};

const getServices = async () => {
    const services = await si.services('*');
    // Normalize for frontend (Linux doesn't return status/displayName like Windows)
    return services.slice(0, 50).map(s => ({
        ...s,
        status: s.running ? 'running' : 'stopped',
        displayName: s.displayName || s.name
    }));
};

const controlService = async (name, action) => {
    try {
        if (process.platform === 'linux') {
            // Use systemctl on Linux
            // Action mapping: start -> start, stop -> stop, restart -> restart
            execSync(`systemctl ${action} ${name}`);
            return { success: true };
        } else {
            // Default to Windows/Powershell
            let cmd = action === 'start' ? 'Start-Service' : 'Stop-Service';
            if (action === 'stop') cmd += ' -Force';
            execSync(`powershell -Command "${cmd} -Name '${name}'"`);
            return { success: true };
        }
    } catch (err) {
        console.error(`Failed to ${action} service ${name}:`, err.message);
        throw new Error(`Failed to ${action} service: ${err.message}`);
    }
};

const controlDocker = async (containerId, action) => {
    const docker = await si.dockerContainers();
    const container = docker.find(c => c.id === containerId);
    if (!container) throw new Error('Container not found');

    // Use docker CLI
    execSync(`docker ${action} ${containerId} `);
    return { success: true };
};

const listFiles = async (dirPath) => {
    try {
        if (dirPath === 'ROOT') {
            const drives = await si.fsSize();
            const items = drives.map(drive => ({
                name: drive.mount,
                isDirectory: true,
                size: drive.size,
                modified: Date.now() // Mock date
            }));
            return { items, path: 'ROOT' };
        }

        let targetPath = dirPath ? path.resolve(dirPath) : process.cwd();

        // Fix for Windows drive letters (e.g. "C:" -> "C:\")
        if (process.platform === 'win32' && /^[a-zA-Z]:$/.test(targetPath)) {
            targetPath += '\\';
        }

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
        throw new Error(`Failed to list files: ${err.message} `);
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
        throw new Error(`Failed to download file: ${err.message} `);
    }
};

const killProcess = async (pid) => {
    if (process.platform === 'win32') {
        try {
            console.log(`Killing process ${pid} using taskkill /F...`);
            const cmd = `taskkill /F /PID ${pid}`;
            execSync(cmd, { stdio: 'ignore' });
            return { success: true };
        } catch (err) {
            console.error(`Failed to kill process ${pid}:`, err.message);
            throw new Error(`Failed to kill process: ${err.message}`);
        }
    } else {
        process.kill(pid);
        return { success: true };


    }
};

// --- Linux Screen Capture ---
const captureScreenLinux = async () => {
    return new Promise(async (resolve, reject) => {
        const fsv = require('fs');

        // 0. Try KMS Grab (Kernel Mode Setting) - Best for Root Agents on Wayland/X11
        // Requires /dev/dri/card0 and ffmpeg support
        let hasKms = false;
        try {
            if (fsv.existsSync('/dev/dri/card0')) {
                // Check if ffmpeg supports kmsgrab (simple check omitted to save time, assuming yes if recent)
                const cmd = "ffmpeg -device /dev/dri/card0 -f kmsgrab -i - -vf 'hwdownload,format=bgr0' -vframes 1 -q:v 5 -f image2 pipe:1";
                const child = spawn(cmd, { shell: true });
                const chunks = [];
                child.stdout.on('data', (chunk) => chunks.push(chunk));
                let stderr = '';
                child.stderr.on('data', (d) => stderr += d.toString());

                await new Promise((resKms) => {
                    child.on('close', (code) => {
                        if (code === 0 && chunks.length > 0) {
                            hasKms = true;
                            resolve(Buffer.concat(chunks));
                        }
                        resKms();
                    });

                    setTimeout(() => {
                        if (child.exitCode === null) { child.kill(); resKms(); }
                    }, 2000);
                });

                if (hasKms) return; // Promise resolved above
            }
        } catch (e) { console.error('KMS capture error:', e.message); }

        // 1. Try gnome-screenshot (Wayland/X11 compliant) if installed
        let hasGnomeScreenshot = false;
        try {
            execSync('which gnome-screenshot');
            hasGnomeScreenshot = true;
        } catch (e) { }

        if (hasGnomeScreenshot) {
            try {
                // Find active user session (look for wayland socket or X11 display in /run/user)
                const runUserDir = '/run/user';
                if (fsv.existsSync(runUserDir)) {
                    const users = fsv.readdirSync(runUserDir);
                    for (const uid of users) {
                        const userDir = path.join(runUserDir, uid);
                        // Check for wayland socket or bus
                        if (fsv.existsSync(path.join(userDir, 'wayland-0')) || fsv.existsSync(path.join(userDir, 'bus'))) {

                            // Resolve username from UID
                            let username = '';
                            try {
                                username = execSync(`id -nu ${uid}`).toString().trim();
                            } catch (e) {
                                // console.warn(`Could not resolve username for uid ${uid}`);
                                continue;
                            }

                            const tempFile = path.join('/tmp', `screen-${Date.now()}.png`);
                            // Use runuser instead of sudo for better service compatibility
                            const cmd = `runuser -u ${username} -- sh -c 'export XDG_RUNTIME_DIR=/run/user/${uid}; export WAYLAND_DISPLAY=wayland-0; export DISPLAY=:0; export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/${uid}/bus; gnome-screenshot -f ${tempFile}'`;

                            try {
                                execSync(cmd, { timeout: 3000 });
                                if (fsv.existsSync(tempFile)) {
                                    const img = fsv.readFileSync(tempFile);
                                    fsv.unlinkSync(tempFile);
                                    resolve(img);
                                    return;
                                }
                            } catch (e) {
                                console.log('Gnome screenshot failed for user', username, e.message);
                            }
                        }
                    }
                }
            } catch (e) {
                // Determine fatal or just fallback
                console.error('Wayland capture failed:', e.message);
            }
        }

        // 2. Fallback to ffmpeg (X11 only)
        // Dynamic XAUTHORITY discovery
        let xauth = '';
        try {
            // Find first Xauthority or Xwaylandauth file in /run/user/
            xauth = execSync("find /run/user/ -name '*Xauthority' -o -name '*Xwaylandauth*' 2>/dev/null | head -n 1").toString().trim();
        } catch (e) { }

        const env = { ...process.env, DISPLAY: ':0' };
        if (xauth) {
            env.XAUTHORITY = xauth;
        }

        // Use ffmpeg with x11grab.
        const cmd = 'ffmpeg -f x11grab -i :0 -vframes 1 -q:v 5 -f image2 pipe:1';

        const child = spawn(cmd, {
            shell: true,
            env: env
        });

        const chunks = [];
        child.stdout.on('data', (chunk) => chunks.push(chunk));

        let stderr = '';
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0 && chunks.length > 0) {
                resolve(Buffer.concat(chunks));
            } else {
                if (stderr.includes('Cannot open display') || stderr.includes('Authorization required')) {
                    reject(new Error(`NO GUI installed (Display :0/Auth failed): ${stderr}`));
                } else if (stderr.includes('command not found')) {
                    reject(new Error('ffmpeg not installed'));
                } else {
                    reject(new Error(`ffmpeg failed (code ${code}): ${stderr}`));
                }
            }
        });

        child.on('error', (err) => {
            reject(new Error(`Spawn failed: ${err.message}`));
        });

        setTimeout(() => {
            if (child.exitCode === null) {
                child.kill();
                reject(new Error('Capture timed out'));
            }
        }, 3000);
    });
};

// --- Local Health Check Server (Optional) ---
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok', version: '3.0.0' }));
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Local health check running on port ${PORT} `);
});
