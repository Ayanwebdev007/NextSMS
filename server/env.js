import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');

console.log('[ENV] STARTING ROBUST LOADER');
console.log('[ENV] Target Path:', envPath);

// 1. Try standard dotenv
const result = dotenv.config({ path: envPath, override: true });

// 2. Manual Parsing Fallback (Foolproof)
try {
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split(/\r?\n/);
        let count = 0;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
                const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
                process.env[key.trim()] = value;
                count++;

                // Sensitive masking for logs
                const mask = value.length > 8 ? value.substring(0, 4) + '...' + value.substring(value.length - 4) : '****';
                console.log(`[ENV] Loaded Key: ${key.trim()} = ${mask}`);
            }
        });
        console.log(`[ENV] Total ${count} variables injected manually.`);
    }
} catch (err) {
    console.error('[ENV] Manual Parse Error:', err.message);
}

const CRITICAL_KEYS = ['GOOGLE_CLIENT_ID', 'RAZORPAY_KEY_ID', 'JWT_SECRET', 'MONGODB_URI'];
CRITICAL_KEYS.forEach(key => {
    if (!process.env[key]) console.error(`[ENV] MISSING CRITICAL KEY: ${key}`);
});

export default process.env;
