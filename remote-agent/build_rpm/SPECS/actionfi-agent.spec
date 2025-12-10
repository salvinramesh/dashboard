Name:           actionfi-agent
Version:        1.1.8
Release:        1
Summary:        ActionFi Remote Monitoring Agent
License:        Proprietary
Group:          System/Monitoring
URL:            http://actionfi.com
Requires:       ffmpeg
Requires:       libatomic1
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
cp /var/www/dashboard/remote-agent/dist/actionfi-agent-linux %{buildroot}/usr/local/bin/actionfi-agent
cp /var/www/dashboard/remote-agent/build_rpm/SOURCES/actionfi-agent.service %{buildroot}/etc/systemd/system/actionfi-agent.service

%files
/usr/local/bin/actionfi-agent
/etc/systemd/system/actionfi-agent.service

%post
# Reload systemd and enable service
echo "Generating Agent ID..."
if [ ! -f /etc/actionfi-agent-id ]; then
    uuidgen > /etc/actionfi-agent-id || echo "Manual-ID-1765305789" > /etc/actionfi-agent-id
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
echo "AGENT_ID=$(cat /etc/actionfi-agent-id)" > /etc/sysconfig/actionfi-agent

systemctl daemon-reload
systemctl enable actionfi-agent
systemctl restart actionfi-agent
echo "ActionFi Agent installed and started."

%preun
if [ $1 -eq 0 ]; then
    systemctl stop actionfi-agent
    systemctl disable actionfi-agent
fi

%postun
if [ $1 -ge 1 ]; then
    systemctl try-restart actionfi-agent
fi

%changelog
* Tue Dec 09 2025 ActionFi <support@actionfi.com> - 1.1.8-1
- Release v1.1.8
