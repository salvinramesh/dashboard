const pool = require('./db');

async function listSystems() {
    try {
        const res = await pool.query('SELECT id, name, created_at FROM systems ORDER BY created_at DESC');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listSystems();
