const pool = require('./db');

async function findSystem() {
    try {
        const res = await pool.query("SELECT * FROM systems WHERE id = 'win-26936-51498'");
        console.log(`Found ${res.rows.length} systems with ID win-26936-51498`);
        if (res.rows.length > 0) {
            console.log(res.rows[0]);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findSystem();
