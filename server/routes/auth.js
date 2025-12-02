const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const { authenticator } = require('otplib');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check for 2FA
        if (user.two_factor_enabled) {
            // Issue a temporary token that is only good for 2FA verification
            const tempToken = jwt.sign(
                { id: user.id, partial: true },
                JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({ status: '2fa_required', tempToken });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login/2fa
router.post('/login/2fa', async (req, res) => {
    const { tempToken, code } = req.body;

    try {
        // Verify temp token
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        if (!decoded.partial) {
            return res.status(400).json({ error: 'Invalid token type' });
        }

        const userId = decoded.id;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Verify TOTP
        const isValid = authenticator.verify({ token: code, secret: user.two_factor_secret });

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid 2FA code' });
        }

        // Issue full token
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });

    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(401).json({ error: 'Invalid or expired session' });
    }
});

// GET /api/auth/me - Verify token and return user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, two_factor_enabled, created_at FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];

        if (!user) {
            return res.sendStatus(404);
        }

        res.json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
