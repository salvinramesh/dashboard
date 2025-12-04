const screenshot = require('screenshot-desktop');
const fs = require('fs');

async function test() {
    try {
        console.log('Attempting to capture screen...');
        const img = await screenshot({ format: 'jpg' });
        console.log('Screenshot captured! Size:', img.length);
        fs.writeFileSync('test-screen.jpg', img);
        console.log('Saved to test-screen.jpg');
    } catch (err) {
        console.error('Screenshot failed:', err);
    }
}

test();
