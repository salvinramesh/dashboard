const pool = require('./db');

async function migrate() {
    try {
        console.log('Altering systems table...');
        await pool.query('ALTER TABLE systems ALTER COLUMN api_url DROP NOT NULL');
        console.log('Successfully dropped NOT NULL constraint on api_url');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        pool.end();
    }
}

migrate();
