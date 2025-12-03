const pool = require('./db');

async function listIds() {
    try {
        const res = await pool.query('SELECT id, name FROM systems');
        console.log('System IDs in DB:');
        res.rows.forEach(row => {
            console.log(`"${row.id}" (${row.name}) - Length: ${row.id.length}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

listIds();
