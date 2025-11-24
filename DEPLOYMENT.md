# Client System Deployment Guide

This guide explains what you need to install on any system you want to monitor with the dashboard.

## Prerequisites

     
     # CentOS/RHEL
     curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
     sudo yum install -y nodejs
     ```

2. **npm** (comes with Node.js)
   - Verify installation:
     ```bash
     node --version  # Should show v18.x or higher
     npm --version   # Should show 8.x or higher
     ```

## Installation Steps

### Step 1: Copy Backend Files
Transfer the backend code to your target system:

**Option A: Using SCP (from dashboard server)**
```bash
scp -r /var/www/dashboard/server user@TARGET_IP:~/system-monitor
```

**Option B: Using Git (if in version control)**
```bash
git clone YOUR_REPO_URL
cd YOUR_REPO/server
```

**Option C: Manual Copy**
Copy just the `server/` directory contents to the target system.

### Step 2: Install Dependencies
On the target system:
```bash
cd ~/system-monitor  # or wherever you copied the files
npm install
```

This will install:
- `express` - Web server framework
- `systeminformation` - System metrics library
- `cors` - Cross-origin resource sharing

### Step 3: Test Run
Start the backend:
```bash
node index.js
```

You should see:
```
Server running on http://localhost:3001
```

Test the API:
```bash
curl http://localhost:3001/api/stats
```

You should get JSON data with system stats.

### Step 4: Network Configuration

#### Find Your IP Address
```bash
# Linux
ip addr show | grep inet

# Windows
ipconfig

# macOS
ifconfig
```

#### Open Firewall Port
The backend runs on port 3001 by default. You need to allow incoming connections:

**Ubuntu/Debian (ufw)**
```bash
sudo ufw allow 3001/tcp
sudo ufw reload
```

**CentOS/RHEL (firewalld)**
```bash
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

**Windows Firewall**
```powershell
New-NetFirewallRule -DisplayName "System Monitor" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Step 5: Add to Dashboard
1. Open the dashboard: http://YOUR_DASHBOARD_IP:5173
2. Click "Settings" in the sidebar
3. Click "Add New System"
4. Fill in the form:
   - **Name**: e.g., "Web Server 1"
   - **Description**: e.g., "Production web server"
   - **API URL**: `http://TARGET_IP:3001` (use the IP from Step 4)
   - **Color**: Choose a theme color
   - **Icon**: Choose an emoji
5. Click "Save"

The system should appear on the overview page!

## Running as a Background Service

### Linux (systemd)
Create a service file:
```bash
sudo nano /etc/systemd/system/system-monitor.service
```

Add this content:
```ini
[Unit]
Description=System Monitor Backend
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/system-monitor
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable system-monitor
sudo systemctl start system-monitor
sudo systemctl status system-monitor
```

### Windows (NSSM)
1. Download NSSM: https://nssm.cc/download
2. Install the service:
   ```cmd
   nssm install SystemMonitor "C:\Program Files\nodejs\node.exe" "C:\path\to\system-monitor\index.js"
   nssm start SystemMonitor
   ```

## Troubleshooting

### Connection Refused
- Check if the backend is running: `curl http://localhost:3001/api/stats`
- Check firewall rules
- Verify the IP address is correct

### Offline Status in Dashboard
- Ping the target system: `ping TARGET_IP`
- Check network connectivity
- Verify port 3001 is open
- Check backend logs for errors

### Permission Errors
Some system metrics require elevated permissions:
```bash
# Linux - run with sudo
sudo node index.js

# Or add user to required groups
sudo usermod -a -G adm YOUR_USERNAME
```

## Security Considerations

### Production Deployments
1. **Use HTTPS**: Set up a reverse proxy (nginx/Apache) with SSL
2. **Authentication**: Add API key authentication to the backend
3. **Firewall**: Only allow connections from your dashboard server IP
4. **VPN**: Consider running over a VPN for extra security

### Example: nginx Reverse Proxy
```nginx
server {
    listen 443 ssl;
    server_name monitor.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}
```

## Quick Reference

### Essential Commands
```bash
# Start backend
node index.js

# Start in background (Linux)
nohup node index.js > output.log 2>&1 &

# Check if running
ps aux | grep "node index.js"

# Stop background process
pkill -f "node index.js"

# View logs (if running as service)
sudo journalctl -u system-monitor -f
```

### File Structure
```
system-monitor/
├── index.js           # Main server file
├── package.json       # Dependencies
├── package-lock.json  # Dependency lock file
└── node_modules/      # Installed packages (after npm install)
```
