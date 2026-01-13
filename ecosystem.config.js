module.exports = {
    apps: [
        {
            name: "nextsms-server",
            script: "./server/app.js",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
