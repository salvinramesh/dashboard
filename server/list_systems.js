const pool = require('./db');

async function listSystems() {
    try {
        const res = await pool.query("SELECT id, name, api_url FROM systems");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

listSystems();
