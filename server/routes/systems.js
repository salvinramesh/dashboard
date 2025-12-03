const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

const { getSystemStatus } = require('../monitor');
const { sendCommand, isAgentConnected } = require('../agentManager');

const getProxyToken = () => {
    return jwt.sign({ username: 'proxy', role: 'system' }, JWT_SECRET, { expiresIn: '1m' });
};

// GET /api/systems - Get all systems
router.get('/', async (req, res) => {
    console.log('GET /api/systems request received');
    try {
        console.log('Fetching systems from DB...');
        const result = await pool.query(
            'SELECT * FROM systems ORDER BY created_at ASC'
        );
        console.log(`Found ${result.rows.length} systems`);

        const systems = result.rows.map(system => {
            const status = getSystemStatus(system.id);
            // console.log(`System ${system.id} status:`, status);
            return {
                ...system,
                status: status?.isOnline ? 'online' : 'offline',
                stats: status?.stats
            };
        });

        console.log('Sending response...');
        try {
            res.json(systems);
        } catch (jsonError) {
            console.error('JSON Serialization Error:', jsonError);
            res.status(500).json({ error: 'Failed to serialize response', details: jsonError.message });
        }
    } catch (error) {
        console.error('Error fetching systems:', error);
        res.status(500).json({ error: 'Failed to fetch systems', details: error.message });
    }
});

// GET /api/systems/:id - Get single system
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM systems WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const system = result.rows[0];
        const status = getSystemStatus(system.id);

        res.json({
            ...system,
            status: status?.isOnline ? 'online' : 'offline',
            stats: status?.stats
        });
    } catch (error) {
        console.error('Error fetching system:', error);
        res.status(500).json({ error: 'Failed to fetch system' });
    }
});

// POST /api/systems - Create new system
router.post('/', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can create systems' });
        }
        const { id, name, description, apiUrl, color, icon, notificationsEnabled } = req.body;

        // Validation
        if (!id || !name || !apiUrl) {
            return res.status(400).json({ error: 'Missing required fields: id, name, apiUrl' });
        }

        const result = await pool.query(
            'INSERT INTO systems (id, name, description, api_url, color, icon, notifications_enabled) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [id, name, description || '', apiUrl, color || 'blue', icon || '🖥️', notificationsEnabled !== undefined ? notificationsEnabled : true]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating system:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'System with this ID already exists' });
        }
        res.status(500).json({ error: 'Failed to create system' });
    }
});

// PUT /api/systems/:id - Update system
router.put('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update systems' });
        }
        const { id } = req.params;
        const { name, description, apiUrl, color, icon, notificationsEnabled } = req.body;

        const result = await pool.query(
            `UPDATE systems 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 api_url = COALESCE($3, api_url),
                 color = COALESCE($4, color),
                 icon = COALESCE($5, icon),
                 notifications_enabled = COALESCE($6, notifications_enabled),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING *`,
            [name, description, apiUrl, color, icon, notificationsEnabled, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating system:', error);
        res.status(500).json({ error: 'Failed to update system' });
    }
});

// DELETE /api/systems/:id - Delete system
router.delete('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete systems' });
        }
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM systems WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        res.json({ message: 'System deleted successfully', system: result.rows[0] });
    } catch (error) {
        console.error('Error deleting system:', error);
        res.status(500).json({ error: 'Failed to delete system' });
    }
});

// Proxy GET /api/systems/:id/resources
router.get('/:id/resources', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT api_url FROM systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const { api_url } = result.rows[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60s for Windows
        const token = getProxyToken();

        try {
            // Use active socket if available
            if (isAgentConnected(id)) {
                const data = await sendCommand(id, 'get-resources', {}, 60000);
                res.json(data);
            } else {
                // Fallback to HTTP if not connected (legacy or local)
                // Or just error out? For now, let's error out if not connected
                // unless we want to support hybrid.
                // Let's assume push-only for now for simplicity.
                res.status(503).json({ error: 'Agent not connected' });
            }
        } catch (err) {
            console.error(`Error fetching resources from ${api_url}:`, err);
            res.status(502).json({ error: 'Failed to reach remote system', details: err.message });
        }
    } catch (error) {
        console.error('Error in resources proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy GET /api/systems/:id/security
router.get('/:id/security', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT api_url FROM systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const { api_url } = result.rows[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60s for Windows
        const token = getProxyToken();

        try {
            if (isAgentConnected(id)) {
                const data = await sendCommand(id, 'get-security', {}, 60000);
                res.json(data);
            } else {
                res.status(503).json({ error: 'Agent not connected' });
            }
        } catch (err) {
            console.error(`Error fetching security from ${api_url}:`, err);
            res.status(502).json({ error: 'Failed to reach remote system', details: err.message });
        }
    } catch (error) {
        console.error('Error in security proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy GET /api/systems/:id/stats
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT api_url FROM systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const { api_url } = result.rows[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60s for Windows
        const token = getProxyToken();

        try {
            if (isAgentConnected(id)) {
                const data = await sendCommand(id, 'get-stats', {}, 60000);
                res.json(data);
            } else {
                res.status(503).json({ error: 'Agent not connected' });
            }
        } catch (err) {
            console.error(`Error fetching stats from ${api_url}:`, err);
            res.status(502).json({ error: 'Failed to reach remote system', details: err.message });
        }
    } catch (error) {
        console.error('Error in stats proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/systems/:id/history
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const { range = '1h' } = req.query;

        let interval;
        switch (range) {
            case '1h':
                interval = '1 hour';
                break;
            case '6h':
                interval = '6 hours';
                break;
            case '24h':
                interval = '24 hours';
                break;
            case '7d':
                interval = '7 days';
                break;
            default:
                interval = '1 hour';
        }

        const query = `
            SELECT 
                cpu_load, 
                memory_used, 
                memory_total, 
                network_rx, 
                network_tx, 
                timestamp
            FROM system_metrics 
            WHERE system_id = $1 
            AND timestamp > NOW() - $2::INTERVAL
            ORDER BY timestamp ASC
        `;

        const result = await pool.query(query, [id, interval]);

        // Format data for frontend
        const history = result.rows.map(row => ({
            timestamp: row.timestamp,
            cpu: row.cpu_load,
            mem: {
                used: parseInt(row.memory_used),
                total: parseInt(row.memory_total)
            },
            network: [{
                rx_bytes: parseInt(row.network_rx),
                tx_bytes: parseInt(row.network_tx)
            }]
        }));

        res.json(history);
    } catch (error) {
        console.error('Error fetching system history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Proxy POST /api/systems/:id/processes/:pid/kill
router.post('/:id/processes/:pid/kill', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can kill processes' });
    }
    try {
        const { id, pid } = req.params;
        const result = await pool.query('SELECT api_url FROM systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const { api_url } = result.rows[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const token = getProxyToken();

        try {
            if (isAgentConnected(id)) {
                const data = await sendCommand(id, 'kill-process', { pid }, 30000);
                res.json(data);
            } else {
                res.status(503).json({ error: 'Agent not connected' });
            }
        } catch (err) {
            console.error(`Error killing process on ${api_url}:`, err);
            res.status(502).json({ error: 'Failed to reach remote system', details: err.message });
        }
    } catch (error) {
        console.error('Error in process kill proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy GET /api/systems/:id/services
router.get('/:id/services', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT api_url FROM systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const { api_url } = result.rows[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const token = getProxyToken();

        try {
            if (isAgentConnected(id)) {
                const data = await sendCommand(id, 'get-services', {}, 15000);
                res.json(data);
            } else {
                res.status(503).json({ error: 'Agent not connected' });
            }
        } catch (err) {
            console.error(`Error fetching services from ${api_url}:`, err);
            res.status(502).json({ error: 'Failed to reach remote system', details: err.message });
        }
    } catch (error) {
        console.error('Error in services proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy POST /api/systems/:id/services/:name/:action
router.post('/:id/services/:name/:action', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can manage services' });
    }
    try {
        const { id, name, action } = req.params;
        const result = await pool.query('SELECT api_url FROM systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const { api_url } = result.rows[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const token = getProxyToken();

        try {
            if (isAgentConnected(id)) {
                const data = await sendCommand(id, 'control-service', { name, action }, 30000);
                res.json(data);
            } else {
                res.status(503).json({ error: 'Agent not connected' });
            }
        } catch (err) {
            console.error(`Error controlling service on ${api_url}:`, err);
            res.status(502).json({ error: 'Failed to reach remote system', details: err.message });
        }
    } catch (error) {
        console.error('Error in service control proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy POST /api/systems/:id/docker/:containerId/:action
router.post('/:id/docker/:containerId/:action', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can manage containers' });
    }
    try {
        const { id, containerId, action } = req.params;
        const result = await pool.query('SELECT api_url FROM systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const { api_url } = result.rows[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const token = getProxyToken();

        try {
            if (isAgentConnected(id)) {
                const data = await sendCommand(id, 'control-docker', { containerId, action }, 15000);
                res.json(data);
            } else {
                res.status(503).json({ error: 'Agent not connected' });
            }
        } catch (err) {
            console.error(`Error controlling docker container on ${api_url}:`, err);
            res.status(502).json({ error: 'Failed to reach remote system', details: err.message });
        }
    } catch (error) {
        console.error('Error in docker control proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy GET /api/systems/:id/files/list
router.get('/:id/files/list', async (req, res) => {
    try {
        const { id } = req.params;
        const { path: dirPath } = req.query;
        const result = await pool.query('SELECT api_url FROM systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const { api_url } = result.rows[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const token = getProxyToken();

        try {
            if (isAgentConnected(id)) {
                const data = await sendCommand(id, 'list-files', { path: dirPath }, 15000);
                res.json(data);
            } else {
                res.status(503).json({ error: 'Agent not connected' });
            }
        } catch (err) {
            console.error(`Error listing files from ${api_url}:`, err);
            res.status(502).json({ error: 'Failed to reach remote system', details: err.message });
        }
    } catch (error) {
        console.error('Error in file list proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy GET /api/systems/:id/files/download
router.get('/:id/files/download', async (req, res) => {
    try {
        const { id } = req.params;
        const { path: filePath } = req.query;
        const result = await pool.query('SELECT api_url FROM systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System not found' });
        }

        const { api_url } = result.rows[0];

        try {
            if (isAgentConnected(id)) {
                // Request file from agent (timeout 60s for larger files)
                const data = await sendCommand(id, 'download-file', { path: filePath }, 60000);

                if (!data || !data.content) {
                    throw new Error('Empty response from agent');
                }

                const fileBuffer = Buffer.from(data.content, 'base64');
                const fileName = data.name || filePath.split('/').pop();

                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.setHeader('Content-Type', data.mime || 'application/octet-stream');
                res.setHeader('Content-Length', fileBuffer.length);

                res.send(fileBuffer);
            } else {
                res.status(503).json({ error: 'Agent not connected' });
            }
        } catch (err) {
            console.error(`Error downloading file from ${api_url}:`, err);
            if (!res.headersSent) {
                res.status(502).json({ error: 'Failed to download file', details: err.message });
            }
        }
    } catch (error) {
        console.error('Error in file download proxy:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;
