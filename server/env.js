import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly point to the .env file in the server directory
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

console.log('[ENV] Loading .env from:', envPath);
if (result.error) {
    console.error('[ENV] Dotenv Error:', result.error);
} else {
    const keysCount = Object.keys(result.parsed || {}).length;
    console.log('[ENV] Dotenv successfully parsed', keysCount, 'variables.');
}

// Diagnostic: Check if we can read the file manually
try {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('[ENV] Manual check: File size is', content.length, 'bytes.');
    if (content.includes('RAZORPAY_KEY_ID')) {
        console.log('[ENV] Manual check: RAZORPAY_KEY_ID exists in file string.');
    } else {
        console.error('[ENV] Manual check: RAZORPAY_KEY_ID NOT FOUND in file string!');
    }
} catch (err) {
    console.error('[ENV] Manual check: Could not read file!', err.message);
}

if (!process.env.RAZORPAY_KEY_ID) {
    console.error('[ENV] CRITICAL: RAZORPAY_KEY_ID is missing from process.env after config!');
}
