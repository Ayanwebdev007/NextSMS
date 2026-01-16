module.exports = {
    apps: [
        {
            name: "nextsms-server",
            script: "./server/app.js",
            env: {
                NODE_ENV: "production",
            },
            kill_timeout: 10000,           // 10s for graceful socket termination
            wait_ready: true,              // Wait for 'process.send("ready")' if we add it
            exp_backoff_restart_delay: 100 // Smooth out rapid restarts
        },
    ],
};
