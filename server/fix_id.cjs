const pool = require('./db');

async function fixId() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const badId = 'win-28023-28818 ';
        const goodId = 'win-28023-28818';

        console.log(`Fixing ID: "${badId}" -> "${goodId}"`);

        // 1. Update metrics
        const resMetrics = await client.query(
            'UPDATE system_metrics SET system_id = $1 WHERE system_id = $2',
            [goodId, badId]
        );
        console.log(`Updated ${resMetrics.rowCount} metrics rows.`);

        // 2. Update system
        const resSystem = await client.query(
            'UPDATE systems SET id = $1 WHERE id = $2',
            [goodId, badId]
        );
        console.log(`Updated ${resSystem.rowCount} system rows.`);

        await client.query('COMMIT');
        console.log('Successfully fixed System ID.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to fix ID:', err);
    } finally {
        client.release();
        pool.end();
    }
}

fixId();
