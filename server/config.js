module.exports = {
    // REPLACE THIS WITH YOUR ACTUAL GOOGLE CHAT WEBHOOK URL
    WEBHOOK_URL: 'https://chat.googleapis.com/v1/spaces/AAQApaLHews/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Py4CHYVPBFigqa-jbFGXLfWq2qRaZYbrQKMLU3laM-s',

    // Thresholds
    MEMORY_THRESHOLD_PERCENT: 95,
    DISK_THRESHOLD_PERCENT: 90,

    // Monitoring Interval in milliseconds (e.g., 1 minute)
    MONITOR_INTERVAL: 10000,

    // Cooldown between alerts in milliseconds (e.g., 1 hour) to avoid spam
    ALERT_COOLDOWN: 60000,

    // JWT Secret
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
};
