#!/bin/bash

# ActionFi Remote Agent Installer for Linux
# Supports: Ubuntu/Debian, CentOS/RHEL, SUSE

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}ActionFi Remote Agent Installer${NC}"
echo "================================="

# Check for root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    DISTRO=$ID
else
    echo -e "${RED}Cannot detect OS. Proceeding with caution.${NC}"
    OS="Unknown"
    DISTRO="unknown"
fi

echo -e "Detected OS: ${YELLOW}$OS ($DISTRO)${NC}"

# Function to install Node.js
install_node() {
    echo "Checking for Node.js..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}Node.js is already installed: $NODE_VERSION${NC}"
    else
        echo -e "${YELLOW}Node.js not found. Installing...${NC}"
        case $DISTRO in
            ubuntu|debian|pop|mint|kali)
                curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
                apt-get install -y nodejs
                ;;
            centos|rhel|fedora|almalinux|rocky)
                curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
                yum install -y nodejs
                ;;
            sles|opensuse*)
                zypper install -y nodejs npm
                ;;
            *)
                echo -e "${RED}Unsupported distribution for auto-install of Node.js.${NC}"
                echo "Please install Node.js (v18+) manually and rerun this script."
                exit 1
                ;;
        esac
        echo -e "${GREEN}Node.js installed successfully.${NC}"
    fi
}

install_node

# Installation Directory
INSTALL_DIR="/opt/actionfi-agent"
SOURCE_DIR=$(dirname "$(readlink -f "$0")")/..

echo "Installing to $INSTALL_DIR..."

# Create directory
mkdir -p "$INSTALL_DIR"

# Copy files
echo "Copying files..."
cp "$SOURCE_DIR/package.json" "$INSTALL_DIR/"
cp "$SOURCE_DIR/index.js" "$INSTALL_DIR/"
# Copy other necessary files if any (e.g., utils folder if it existed, but index.js is self-contained mostly)
# If index.js relies on other local files, copy them here.
# Based on previous review, index.js seems self-contained or uses node_modules.

# Install dependencies
echo "Installing dependencies..."
cd "$INSTALL_DIR"
npm install --production

# Configuration
echo "================================="
echo "Configuration"
echo "================================="

# Prompt for Dashboard URL
read -p "Enter Dashboard URL (e.g., http://your-server-ip:3006): " DASHBOARD_URL
while [[ -z "$DASHBOARD_URL" ]]; do
    echo -e "${RED}Dashboard URL is required.${NC}"
    read -p "Enter Dashboard URL: " DASHBOARD_URL
done

# Prompt for Agent Name
HOSTNAME=$(hostname)
read -p "Enter Agent Name [${HOSTNAME}]: " AGENT_NAME
AGENT_NAME=${AGENT_NAME:-$HOSTNAME}

# Generate Agent ID
AGENT_ID="linux-$(date +%s)-$(cat /proc/sys/kernel/random/uuid | cut -c1-8)"

# Generate JWT Secret (Local secret for internal use, though agent mainly uses token from server)
# Actually, the agent needs a JWT_SECRET to sign its own tokens for registration? 
# Looking at index.js: const token = jwt.sign({ role: 'agent', id: AGENT_ID }, JWT_SECRET, { expiresIn: '1h' });
# So yes, it needs a secret. Ideally this should be shared with the server or provided by the user.
# BUT, in the current architecture, does the server verify this token using the SAME secret?
# server/index.js: const user = jwt.verify(token, process.env.JWT_SECRET);
# YES. The agent MUST have the SAME JWT_SECRET as the Dashboard Server.

echo -e "${YELLOW}IMPORTANT: The Agent needs the SAME JWT Secret as your Dashboard Server.${NC}"
read -p "Enter Dashboard JWT Secret: " JWT_SECRET
while [[ -z "$JWT_SECRET" ]]; do
    echo -e "${RED}JWT Secret is required.${NC}"
    read -p "Enter Dashboard JWT Secret: " JWT_SECRET
done

# Create .env
echo "Creating .env file..."
cat > "$INSTALL_DIR/.env" <<EOF
PORT=4000
DASHBOARD_URL=$DASHBOARD_URL
AGENT_NAME=$AGENT_NAME
AGENT_ID=$AGENT_ID
JWT_SECRET=$JWT_SECRET
EOF

# Setup Service
echo "Setting up systemd service..."
cp "$SOURCE_DIR/linux-installer/actionfi-agent.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable actionfi-agent
systemctl restart actionfi-agent

echo "================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "Agent ID: $AGENT_ID"
echo "Service Status:"
systemctl status actionfi-agent --no-pager

echo -e "${YELLOW}Note: You may need to allow port 4000 if you use the local health check.${NC}"
