const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const authenticateToken = require('../middleware/auth');

// Generate 2FA Secret
router.post('/setup', authenticateToken, async (req, res) => {
    try {
        const secret = authenticator.generateSecret();
        const user = req.user;

        // Save secret temporarily (or permanently but disabled)
        await pool.query(
            'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
            [secret, user.id]
        );

        const otpauth = authenticator.keyuri(user.username, 'ActionFi Dashboard', secret);
        const imageUrl = await qrcode.toDataURL(otpauth);

        res.json({ secret, qrCode: imageUrl });
    } catch (error) {
        console.error('Error generating 2FA secret:', error);
        res.status(500).json({ error: 'Failed to generate 2FA secret' });
    }
});

// Verify and Enable 2FA
router.post('/enable', authenticateToken, async (req, res) => {
    const { token } = req.body;
    const userId = req.user.id;

    try {
        const result = await pool.query('SELECT two_factor_secret FROM users WHERE id = $1', [userId]);
        const secret = result.rows[0]?.two_factor_secret;

        if (!secret) {
            return res.status(400).json({ error: '2FA setup not initiated' });
        }

        const isValid = authenticator.verify({ token, secret });

        if (isValid) {
            await pool.query('UPDATE users SET two_factor_enabled = TRUE WHERE id = $1', [userId]);
            res.json({ message: '2FA enabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid token' });
        }
    } catch (error) {
        console.error('Error enabling 2FA:', error);
        res.status(500).json({ error: 'Failed to enable 2FA' });
    }
});

// Disable 2FA
router.post('/disable', authenticateToken, async (req, res) => {
    const { token } = req.body; // Require token to disable for security
    const userId = req.user.id;

    try {
        const result = await pool.query('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1', [userId]);
        const { two_factor_secret: secret, two_factor_enabled: enabled } = result.rows[0];

        if (!enabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        const isValid = authenticator.verify({ token, secret });

        if (isValid) {
            await pool.query('UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = $1', [userId]);
            res.json({ message: '2FA disabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid token' });
        }
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

module.exports = router;
