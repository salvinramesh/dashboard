const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');

const token = jwt.sign({ id: 'admin-id', username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
console.log(token);
