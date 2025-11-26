const jwt = require('jsonwebtoken');
const secret = 'your-secret-key-change-in-production';
const token = jwt.sign({ id: 'test-admin', username: 'admin', role: 'admin' }, secret, { expiresIn: '1h' });
console.log(token);
