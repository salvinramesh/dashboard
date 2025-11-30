const pool = require('./db');

const createMetricsTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_metrics (
                id SERIAL PRIMARY KEY,
                system_id VARCHAR REFERENCES systems(id) ON DELETE CASCADE,
                cpu_load FLOAT,
                memory_used BIGINT,
                memory_total BIGINT,
                disk_usage JSONB,
                network_rx BIGINT,
                network_tx BIGINT,
                timestamp TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_system_metrics_system_id_timestamp ON system_metrics(system_id, timestamp);
        `);
        console.log('✅ system_metrics table created successfully');
    } catch (err) {
        console.error('❌ Error creating system_metrics table:', err);
    } finally {
        pool.end();
    }
};

createMetricsTable();
