const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const REMOTE_AGENT_PATH = path.join(__dirname, '../../remote-agent');

// GET /api/agent/version
router.get('/version', (req, res) => {
    try {
        const packageJsonPath = path.join(REMOTE_AGENT_PATH, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return res.status(404).json({ error: 'Agent package.json not found' });
        }
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        res.json({ version: packageJson.version });
    } catch (error) {
        console.error('Error reading agent version:', error);
        res.status(500).json({ error: 'Failed to get agent version' });
    }
});

// GET /api/agent/download
router.get('/download', (req, res) => {
    try {
        const agentPath = path.join(REMOTE_AGENT_PATH, 'index.js');
        if (!fs.existsSync(agentPath)) {
            return res.status(404).json({ error: 'Agent file not found' });
        }
        res.download(agentPath, 'index.js');
    } catch (error) {
        console.error('Error downloading agent:', error);
        res.status(500).json({ error: 'Failed to download agent' });
    }
});

module.exports = router;
