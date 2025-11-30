const express = require('express');
const router = express.Router();
const pool = require('../db');

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

module.exports = router;
