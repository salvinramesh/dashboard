#!/bin/bash
set -e

# Configuration
VERSION="1.1.10"
ARCH="x86_64"
PACKAGE_NAME="actionfi-agent"
BUILD_DIR="build_rpm"
DIST_DIR="dist"
RPMOPTS="--define '_topdir $(pwd)/${BUILD_DIR}'"

# Ensure environment variables are loaded
if [ -f "../server/.env" ]; then
    export $(grep -v '^#' ../server/.env | xargs)
fi

if [ -z "$DASHBOARD_URL" ] || [ -z "$JWT_SECRET" ]; then
    echo "Error: DASHBOARD_URL or JWT_SECRET not found in ../server/.env"
    exit 1
fi

echo "Building ActionFi Linux Agent RPM (v${VERSION})..."

# 1. Compile with pkg if not exists
if [ ! -f "dist/actionfi-agent-linux" ]; then
    echo "Compiling binary with pkg..."
    npm run build-linux
fi

# 2. Prepare RPM Build Structure
rm -rf ${BUILD_DIR}
mkdir -p ${BUILD_DIR}/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# 3. Create Service File
cat > ${BUILD_DIR}/SOURCES/${PACKAGE_NAME}.service <<EOF
[Unit]
Description=ActionFi Remote Agent
After=network.target

[Service]
ExecStart=/usr/local/bin/${PACKAGE_NAME}
Restart=always
User=root
WorkingDirectory=/usr/local/bin
Environment=NODE_ENV=production
Environment=DASHBOARD_URL=${DASHBOARD_URL}
Environment=JWT_SECRET=${JWT_SECRET}
EnvironmentFile=-/etc/sysconfig/actionfi-agent

[Install]
WantedBy=multi-user.target
EOF

# 4. Create Spec File
cat > ${BUILD_DIR}/SPECS/${PACKAGE_NAME}.spec <<EOF
Name:           ${PACKAGE_NAME}
Version:        ${VERSION}
Release:        1
Summary:        ActionFi Remote Monitoring Agent
License:        Proprietary
Group:          System/Monitoring
URL:            http://actionfi.com
# Requires:       ffmpeg
# Requires:       libatomic.so.1
# ydotool is optional (install manually for remote input)
 
# Disable binary stripping as it breaks pkg binaries
%define __strip /bin/true
%define __objdump /bin/true
%define debug_package %{nil}
# gnome-screenshot is optional (install manually for wayland fallback)
# Dependencies might vary by distro, assuming generic names or packman

%description
A lightweight agent for monitoring system resources, services, and containers.
Configured to connect to your ActionFi Dashboard.

%install
mkdir -p %{buildroot}/usr/local/bin
mkdir -p %{buildroot}/etc/systemd/system
cp $(pwd)/dist/actionfi-agent-linux %{buildroot}/usr/local/bin/${PACKAGE_NAME}
cp $(pwd)/${BUILD_DIR}/SOURCES/${PACKAGE_NAME}.service %{buildroot}/etc/systemd/system/${PACKAGE_NAME}.service

%files
/usr/local/bin/${PACKAGE_NAME}
/etc/systemd/system/${PACKAGE_NAME}.service

%post
# Reload systemd and enable service
echo "Generating Agent ID..."
if [ ! -f /etc/actionfi-agent-id ]; then
    uuidgen > /etc/actionfi-agent-id || echo "Manual-ID-$(date +%s)" > /etc/actionfi-agent-id
fi
chmod 600 /etc/actionfi-agent-id

# Inject ID into service Environment (simple method for now: append to unit file or separate env file?)
# For RPM, editing the unit file in %post is risky on upgrades.
# Better to use a separate EnvironmentFile.
# But for consistency with deb, we'll iterate.
# Actually, the Node.js agent checks /etc/actionfi-agent-id if env var is missing? 
# No, currently code relies on env var AGENT_ID.
# Let's adjust service file to read EnvironmentFile=-/etc/default/actionfi-agent
# AND dynamically write that file.

# For now, let's just stick to the Deb logic: direct injection isn't great but...
# Let's try to grab ID and put it in /etc/sysconfig/actionfi-agent (RHEL/SuSE standard)
# And update unit file to use it.
# Wait, spec file is static.
# Let's write ID to /etc/actionfi-agent-config
echo "AGENT_ID=\$(cat /etc/actionfi-agent-id)" > /etc/sysconfig/actionfi-agent

systemctl daemon-reload
systemctl enable ${PACKAGE_NAME}
systemctl restart ${PACKAGE_NAME}
echo "ActionFi Agent installed and started."

%preun
if [ \$1 -eq 0 ]; then
    systemctl stop ${PACKAGE_NAME}
    systemctl disable ${PACKAGE_NAME}
fi

%postun
if [ \$1 -ge 1 ]; then
    systemctl try-restart ${PACKAGE_NAME}
fi

%changelog
* Tue Dec 09 2025 ActionFi <support@actionfi.com> - ${VERSION}-1
- Release v${VERSION}
EOF

# 5. Build RPM
# Note: We aren't using a SOURCE tarball, we are copying files directly in %install from outside.
# This works but rpmbuild might complain about missing sources.
# A common trick is to treat the binary as a source or just copy in %install using absolute paths (as done above).

rpmbuild -bb --define "_topdir $(pwd)/${BUILD_DIR}" ${BUILD_DIR}/SPECS/${PACKAGE_NAME}.spec

# 5b. Sign Package
if [ -f ~/.rpmmacros ] && grep -q "%_gpg_name" ~/.rpmmacros; then
    echo "Signing RPM package..."
    rpm --addsign ${BUILD_DIR}/RPMS/${ARCH}/${PACKAGE_NAME}-${VERSION}-1.${ARCH}.rpm
fi

# 6. Copy artifact
mkdir -p ${DIST_DIR}
cp ${BUILD_DIR}/RPMS/${ARCH}/${PACKAGE_NAME}-${VERSION}-1.${ARCH}.rpm ${DIST_DIR}/

echo "Success! Package created: ${DIST_DIR}/${PACKAGE_NAME}-${VERSION}-1.${ARCH}.rpm"

# 7. Generate Repo File (RHEL/CentOS/Fedora)
echo "Generating actionfi.repo..."
cat > ${DIST_DIR}/actionfi.repo <<REPO
[actionfi]
name=ActionFi Repository
baseurl=${DASHBOARD_URL}/repo/rpm
enabled=1
gpgcheck=1
gpgkey=${DASHBOARD_URL}/repo/rpm/RPM-GPG-KEY-actionfi
REPO

echo "Repo file created: ${DIST_DIR}/actionfi.repo"
