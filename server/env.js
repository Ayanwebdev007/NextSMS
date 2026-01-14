import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly point to the .env file in the server directory
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

console.log('[ENV] Environment variables loaded from:', envPath);
if (!process.env.RAZORPAY_KEY_ID) {
    console.error('[ENV] WARNING: RAZORPAY_KEY_ID not found in environment!');
}
