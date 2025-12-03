#!/bin/bash

# Builder Script for ActionFi Linux Installer
set -e

echo "ActionFi Linux Installer Builder"
echo "================================"

# Prompt for Config
read -p "Enter Dashboard URL (e.g., http://117.247.180.176:3006): " DASHBOARD_URL
read -p "Enter JWT Secret: " JWT_SECRET
read -p "Default Agent Name [AUTO_HOSTNAME]: " AGENT_NAME
AGENT_NAME=${AGENT_NAME:-AUTO_HOSTNAME}

if [ -z "$DASHBOARD_URL" ] || [ -z "$JWT_SECRET" ]; then
    echo "Error: Dashboard URL and JWT Secret are required."
    exit 1
fi

# Create dist directory
mkdir -p dist

# Create temporary tarball of the agent
echo "Packaging agent files..."
tar -czf dist/agent-payload.tar.gz \
    index.js \
    package.json \
    linux-installer/actionfi-agent.service

# Read Template
TEMPLATE=$(cat linux-installer/installer.template.sh)

# Replace Placeholders
echo "Generating installer..."
OUTPUT_FILE="dist/actionfi-linux-install.run"

# Escape special characters for sed
ESCAPED_URL=$(printf '%s\n' "$DASHBOARD_URL" | sed -e 's/[\/&]/\\&/g')
ESCAPED_SECRET=$(printf '%s\n' "$JWT_SECRET" | sed -e 's/[\/&]/\\&/g')

sed -e "s|__DASHBOARD_URL__|$ESCAPED_URL|g" \
    -e "s|__JWT_SECRET__|$ESCAPED_SECRET|g" \
    -e "s|__AGENT_NAME__|$AGENT_NAME|g" \
    linux-installer/installer.template.sh > "$OUTPUT_FILE"

# Append Payload
cat dist/agent-payload.tar.gz >> "$OUTPUT_FILE"

# Make Executable
chmod +x "$OUTPUT_FILE"

# Cleanup
rm dist/agent-payload.tar.gz

echo "================================"
echo "Installer created: $OUTPUT_FILE"
echo "You can now distribute this file to your Linux servers."
echo "Usage: sudo ./actionfi-linux-install.run"
