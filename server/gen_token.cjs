const jwt = require('jsonwebtoken');
const secret = 'your-secret-key-change-in-production';
const token = jwt.sign({ username: 'admin', role: 'admin' }, secret, { expiresIn: '1h' });
console.log(token);
