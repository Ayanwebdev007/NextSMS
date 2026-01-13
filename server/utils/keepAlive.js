import https from 'https';

/**
 * Self-ping mechanism to keep Render free tier active
 * Makes an HTTP request to the server every 10 minutes
 */
export const startKeepAlive = () => {
    const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
    const BACKEND_URL = process.env.BACKEND_URL || 'https://nextsms-backend.onrender.com';

    const ping = () => {
        const url = `${BACKEND_URL}/api/health`;
        console.log(`[KEEP-ALIVE] Self-pinging ${url}...`);

        https.get(url, (res) => {
            console.log(`[KEEP-ALIVE] Ping successful. Status: ${res.statusCode}`);
        }).on('error', (err) => {
            console.error(`[KEEP-ALIVE] Ping failed:`, err.message);
        });
    };

    // Initial ping after 1 minute
    setTimeout(() => {
        ping();
        // Then ping every 10 minutes
        setInterval(ping, PING_INTERVAL);
    }, 60000);

    console.log('[KEEP-ALIVE] Self-ping mechanism started. Will ping every 10 minutes.');
};
