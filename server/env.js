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

if (result.error) {
    console.error('[ENV] Dotenv Standard Error:', result.error.message);
}

// 2. Manual Parsing Fallback (Foolproof)
try {
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        console.log('[ENV] File exists. Size:', content.length, 'bytes.');

        const lines = content.split(/\r?\n/);
        let count = 0;

        lines.forEach(line => {
            const trimmed = line.trim();
            // Ignore comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) return;

            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
                const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
                process.env[key.trim()] = value;
                count++;
            }
        });
        console.log(`[ENV] Manually injected ${count} variables.`);
    } else {
        console.error('[ENV] CRITICAL: .env file does not exist at', envPath);
    }
} catch (err) {
    console.error('[ENV] Manual Parse Error:', err.message);
}

// 3. Final Verification
if (process.env.RAZORPAY_KEY_ID) {
    console.log('[ENV] SUCCESS: RAZORPAY_KEY_ID is now loaded.');
} else {
    console.error('[ENV] FAILURE: RAZORPAY_KEY_ID is still missing!');
}

export default process.env;
