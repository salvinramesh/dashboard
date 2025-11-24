const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
    user: 'sysmon_user',
    host: 'localhost',
    database: 'sysmon_dashboard',
    password: 'simplepassword123',
    port: 5432,
});

// Test connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool;
