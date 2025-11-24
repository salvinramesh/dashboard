const express = require('express');
const si = require('systeminformation');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/api/stats', async (req, res) => {
    try {
        const [cpu, mem, networkStats, osInfo] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats(),
            si.osInfo()
        ]);

        // Calculate network speed (simplified for this demo)
        // In a real app, we'd need to compare with previous sample
        // For now, just sending total rx/tx which is cumulative
        // But the frontend can calculate diff or we can do it here if we keep state.

        // Let's keep it stateless for now and send the raw data.
        // Actually, to show speed, we need rate.
        // systeminformation's networkStats returns rx_sec and tx_sec if available?
        // Let's check docs or just assume we send raw and frontend handles it or we use a different call.
        // si.networkStats() returns rx_sec which is bytes per second if supported.

        res.json({
            cpu: cpu.currentLoad,
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
                tx_bytes: iface.tx_bytes
            })),
            os: {
                platform: osInfo.platform,
                distro: osInfo.distro,
                release: osInfo.release,
                hostname: osInfo.hostname
            },
            uptime: si.time().uptime
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
