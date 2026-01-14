import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('\n' + '='.repeat(50));
console.log('🔱 NEXTSMS MAINTENANCE MASTER - VERSION 1.1.14');
console.log('='.repeat(50) + '\n');

// 1. RAM AUDIT
const memTotal = Math.round(os.totalmem() / 1024 / 1024);
const memFree = Math.round(os.freemem() / 1024 / 1024);
const processUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

console.log(`📊 RAM STATUS:`);
console.log(`- System Total: ${memTotal} MB`);
console.log(`- System Free:  ${memFree} MB`);
console.log(`- This Process: ${processUsage} MB\n`);

// 2. DISK AUDIT (Project Files)
console.log(`📂 PROJECT STORAGE AUDIT:`);
const getDirSize = (p) => {
    try {
        const output = execSync(`du -sh ${p}`, { encoding: 'utf8' });
        return output.split('\t')[0];
    } catch (e) { return 'N/A'; }
};

const projectRoot = path.resolve('..');
const nodeModulesSize = getDirSize(path.join(projectRoot, 'server/node_modules'));
const uploadsSize = getDirSize(path.join(projectRoot, 'server/uploads'));
const tempAuthSize = getDirSize(path.join(os.tmpdir(), 'baileys_auth'));

console.log(`- Node Modules: ${nodeModulesSize}`);
console.log(`- Uploads:      ${uploadsSize}`);
console.log(`- Temp Auth:     ${tempAuthSize}\n`);

// 3. LOG AUDIT
console.log(`📜 PM2 LOG STATUS:`);
try {
    const logs = execSync('pm2 list', { encoding: 'utf8' });
    console.log(logs);
} catch (e) {
    console.log('PM2 not found or not running.');
}

console.log('\n💡 RECOMMENDATIONS:');
console.log('1. To clear logs:    pm2 flush');
console.log('2. To prune modules: npm prune (Run in server folder)');
console.log('3. To clear temp:    rm -rf ' + path.join(os.tmpdir(), 'baileys_auth'));
console.log('4. For memory limit: pm2 start app.js --max-old-space-size=512\n');
