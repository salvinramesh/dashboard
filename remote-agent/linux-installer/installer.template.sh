#!/bin/bash
# ActionFi Self-Contained Linux Installer

# --- Configuration (Injected by Builder) ---
DASHBOARD_URL="__DASHBOARD_URL__"
JWT_SECRET="__JWT_SECRET__"
AGENT_NAME="__AGENT_NAME__"
# -------------------------------------------

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}ActionFi Remote Agent Installer${NC}"
echo "================================="

# Check root
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
    OS="Unknown"
    DISTRO="unknown"
fi
echo -e "Detected OS: ${YELLOW}$OS ($DISTRO)${NC}"

# Install Node.js
# Install Standalone Node.js (Ensures compatibility)
install_node() {
    echo -e "${YELLOW}Installing standalone Node.js v20...${NC}"
    NODE_VERSION="v20.10.0"
    ARCH="x64" # Assuming x64 for now, can add detection later
    NODE_DIST="node-$NODE_VERSION-linux-$ARCH"
    
    mkdir -p "$INSTALL_DIR/node"
    curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/$NODE_DIST.tar.xz" | tar -xJ -C "$INSTALL_DIR/node" --strip-components=1
    
    # Export for current session
    export PATH="$INSTALL_DIR/node/bin:$PATH"
    echo -e "${GREEN}Node.js $NODE_VERSION installed to $INSTALL_DIR/node${NC}"
}
# Setup Directories First
INSTALL_DIR="/opt/actionfi-agent"
mkdir -p "$INSTALL_DIR"

install_node
    
# Install Build Tools (Required for node-pty)
install_build_tools() {
    echo -e "${YELLOW}Checking for build tools...${NC}"
    case $DISTRO in
        ubuntu|debian|pop|mint|kali)
            apt-get update
            apt-get install -y python3 make g++ build-essential
            ;;
        centos|rhel|fedora|almalinux|rocky)
            yum groupinstall -y "Development Tools"
            yum install -y python3
            ;;
        sles|opensuse*)
            zypper install -y -t pattern devel_basis
            zypper install -y python3
            ;;
        *)
            echo -e "${YELLOW}Warning: Could not auto-install build tools. Terminal functionality might fail.${NC}"
            ;;
    esac
}
install_build_tools



# Extract Payload
echo "Extracting agent files..."
# Find the line number where the payload starts
PAYLOAD_LINE=$(awk '/^__PAYLOAD_BEGINS__/ {print NR + 1; exit 0; }' "$0")
tail -n +$PAYLOAD_LINE "$0" | tar -xz -C "$INSTALL_DIR"

# Install Dependencies
echo "Installing dependencies..."
cd "$INSTALL_DIR"
npm install --production

# Generate Config
echo "Configuring agent..."
if [ "$AGENT_NAME" == "AUTO_HOSTNAME" ]; then
    AGENT_NAME=$(hostname)
fi
AGENT_ID="linux-$(date +%s)-$(cat /proc/sys/kernel/random/uuid | cut -c1-8)"

cat > "$INSTALL_DIR/.env" <<EOF
PORT=4000
DASHBOARD_URL=$DASHBOARD_URL
AGENT_NAME=$AGENT_NAME
AGENT_ID=$AGENT_ID
JWT_SECRET=$JWT_SECRET
EOF

# Setup Service
echo "Setting up service..."
cp "$INSTALL_DIR/linux-installer/actionfi-agent.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable actionfi-agent
systemctl restart actionfi-agent

echo "================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "Agent ID: $AGENT_ID"
echo "Dashboard: $DASHBOARD_URL"
exit 0

__PAYLOAD_BEGINS__
