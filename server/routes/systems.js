const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/systems - Get all systems
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM systems ORDER BY created_at ASC'
        );
        res.json(result.rows);
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

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching system:', error);
        res.status(500).json({ error: 'Failed to fetch system' });
    }
});

// POST /api/systems - Create new system
router.post('/', async (req, res) => {
    try {
        const { id, name, description, apiUrl, color, icon } = req.body;

        // Validation
        if (!id || !name || !apiUrl) {
            return res.status(400).json({ error: 'Missing required fields: id, name, apiUrl' });
        }

        const result = await pool.query(
            'INSERT INTO systems (id, name, description, api_url, color, icon) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [id, name, description || '', apiUrl, color || 'blue', icon || '🖥️']
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
        const { id } = req.params;
        const { name, description, apiUrl, color, icon } = req.body;

        const result = await pool.query(
            `UPDATE systems 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 api_url = COALESCE($3, api_url),
                 color = COALESCE($4, color),
                 icon = COALESCE($5, icon),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [name, description, apiUrl, color, icon, id]
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

module.exports = router;
