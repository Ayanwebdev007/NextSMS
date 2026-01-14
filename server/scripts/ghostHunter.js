const { execSync } = require('child_process');
const fs = require('fs');

console.log('--- NEXTSMS GHOST HUNTER ---');

try {
    console.log('\n[1] Checking PM2 Status:');
    const pm2List = execSync('pm2 list', { encoding: 'utf8' });
    console.log(pm2List);
} catch (e) {
    console.log('PM2 not found or error: ' + e.message);
}

try {
    console.log('\n[2] Checking Active Ports (5000, 5005, 3000):');
    const ports = ['5000', '5005', '3000'];
    ports.forEach(port => {
        try {
            const netstat = execSync(`netstat -lntp | grep :${port}`, { encoding: 'utf8' });
            console.log(`Port ${port}: ${netstat.trim()}`);
        } catch (e) {
            console.log(`Port ${port}: Free`);
        }
    });
} catch (e) { }

try {
    console.log('\n[3] Checking All Node Processes:');
    const ps = execSync('ps aux | grep node | grep -v grep', { encoding: 'utf8' });
    console.log(ps);
} catch (e) { }

try {
    console.log('\n[4] Checking Nginx Configuration:');
    const nginx = execSync('grep -r "proxy_pass" /etc/nginx/sites-enabled/ || echo "No Nginx proxy found"', { encoding: 'utf8' });
    console.log(nginx);
} catch (e) { }

console.log('\n--- END REPORT ---');
