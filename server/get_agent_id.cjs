const pool = require('./db');

(async () => {
    try {
        const res = await pool.query('SELECT id FROM systems LIMIT 1');
        if (res.rows.length > 0) {
            console.log('AGENT_ID=' + res.rows[0].id);
        } else {
            console.log('No systems found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
})();
