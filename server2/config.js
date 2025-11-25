module.exports = {
    // REPLACE THIS WITH YOUR ACTUAL GOOGLE CHAT WEBHOOK URL
    WEBHOOK_URL: 'https://chat.googleapis.com/v1/spaces/PLACEHOLDER',

    // Thresholds
    MEMORY_THRESHOLD_PERCENT: 90,
    DISK_THRESHOLD_PERCENT: 90,

    // Monitoring Interval in milliseconds (e.g., 1 minute)
    MONITOR_INTERVAL: 60000,

    // Cooldown between alerts in milliseconds (e.g., 1 hour) to avoid spam
    ALERT_COOLDOWN: 3600000
};
