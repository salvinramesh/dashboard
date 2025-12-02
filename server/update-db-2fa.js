const pool = require('./db');

const updateDb = async () => {
    try {
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
            ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS backup_codes TEXT;
        `);
        console.log('Database updated successfully');
    } catch (error) {
        console.error('Error updating database:', error);
    } finally {
        pool.end();
    }
};

updateDb();
