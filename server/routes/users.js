const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/auth');

// Protect all routes
router.use(authenticateToken);

// GET /api/users - List all users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Only admins can create users (enforced by UI, but good to check here too if we want strictness)
    // For now, allowing any authenticated user to create (as per previous logic), but we will enforce admin-only in frontend.
    // Actually, let's enforce it here:
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can create users' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const userRole = role || 'std';
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
            [username, passwordHash, userRole]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete users' });
    }

    // Prevent deleting self
    if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// PUT /api/users/:id - Update user (password/role)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update users' });
    }

    try {
        // First check if user exists
        const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if new username already exists
        if (username && username !== userCheck.rows[0].username) {
            const usernameCheck = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]);
            if (usernameCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Username already exists' });
            }
        }

        let query = 'UPDATE users SET ';
        const values = [];
        let paramCount = 1;

        if (username) {
            query += `username = $${paramCount}, `;
            values.push(username);
            paramCount++;
        }

        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            query += `password_hash = $${paramCount}, `;
            values.push(passwordHash);
            paramCount++;
        }

        if (role) {
            query += `role = $${paramCount}, `;
            values.push(role);
            paramCount++;
        }

        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += ` WHERE id = $${paramCount} RETURNING id, username, role, created_at`;
        values.push(id);

        if (values.length === 1) { // Only ID is in values, meaning no fields to update
            return res.json(userCheck.rows[0]);
        }

        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

module.exports = router;
