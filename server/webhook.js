const https = require('https');
const { WEBHOOK_URL } = require('./config');

const sendAlert = (message) => {
    if (!WEBHOOK_URL || WEBHOOK_URL.includes('PLACEHOLDER')) {
        console.log('[Webhook] Mock send:', message);
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ text: message });
        const url = new URL(WEBHOOK_URL);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Content-Length': Buffer.byteLength(data),
            },
        };

        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    console.error(`[Webhook] Failed with status ${res.statusCode}. Response: ${responseBody}`);
                    reject(new Error(`Webhook failed with status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('[Webhook] Error sending alert:', error);
            reject(error);
        });

        req.write(data);
        req.end();
    });
};

module.exports = { sendAlert };
