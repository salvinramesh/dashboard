#!/bin/bash
set -e

# Configuration
VERSION="1.1.8"
ARCH="amd64"
PACKAGE_NAME="actionfi-agent"
BUILD_DIR="build_deb"
DIST_DIR="dist"
DEB_NAME="${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"

echo "Building ActionFi Linux Agent (v${VERSION})..."

# 1. Build Binary
echo "Compiling binary with pkg..."
npm run build-linux

# 2. Prepare Directory Structure
echo "Preparing package structure..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/usr/local/bin"
mkdir -p "$BUILD_DIR/etc/systemd/system"
mkdir -p "$BUILD_DIR/DEBIAN"

# 3. Copy Files
cp "$DIST_DIR/actionfi-agent-linux" "$BUILD_DIR/usr/local/bin/actionfi-agent"
cp "linux-installer/actionfi-agent.service" "$BUILD_DIR/etc/systemd/system/"
cp "linux-installer/control" "$BUILD_DIR/DEBIAN/"
cp "linux-installer/postinst" "$BUILD_DIR/DEBIAN/"

# Inject Configuration
DASHBOARD_URL="http://117.247.180.176:3006"
# Extract JWT_SECRET from ../server/.env (naive grep)
JWT_SECRET=$(grep JWT_SECRET ../server/.env | cut -d '=' -f2)

if [ -z "$JWT_SECRET" ]; then
    echo "Error: Could not find JWT_SECRET in ../server/.env"
    exit 1
fi

# Append Environment variables to the service file (inserting after [Service] block start)
sed -i "/^\[Service\]/a Environment=JWT_SECRET=$JWT_SECRET\nEnvironment=DASHBOARD_URL=$DASHBOARD_URL" "$BUILD_DIR/etc/systemd/system/actionfi-agent.service"

# 4. Set Permissions
chmod 755 "$BUILD_DIR/DEBIAN/postinst"
chmod 755 "$BUILD_DIR/usr/local/bin/actionfi-agent"

# 5. Build DEB
echo "Building .deb package..."
dpkg-deb --build "$BUILD_DIR" "$DIST_DIR/$DEB_NAME"

echo "Success! Package created: $DIST_DIR/$DEB_NAME"
