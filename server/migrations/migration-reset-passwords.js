/**
 * Migration Script: Reset All User Passwords to 123456
 * 
 * This script updates all existing business accounts to have password "123456"
 * Useful for accounts created via Google OAuth that don't have usable passwords
 * 
 * Usage: node migration-reset-passwords.js
 */

import '../env.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Business } from '../models/business.model.js';

const NEW_PASSWORD = '123456';

async function resetAllPasswords() {
    try {
        console.log('[MIGRATION] Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('[MIGRATION] Connected successfully\n');

        // Get all businesses
        const businesses = await Business.find({});
        console.log(`[MIGRATION] Found ${businesses.length} business account(s)\n`);

        if (businesses.length === 0) {
            console.log('[MIGRATION] No accounts to update. Exiting.');
            process.exit(0);
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

        console.log('[MIGRATION] Starting password reset...\n');

        let successCount = 0;
        let failCount = 0;

        for (const business of businesses) {
            try {
                business.password = hashedPassword;
                await business.save();

                console.log(`✅ Updated: ${business.email} (${business.name})`);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed: ${business.email} - ${error.message}`);
                failCount++;
            }
        }

        console.log(`\n[MIGRATION] Complete!`);
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log(`\nAll accounts can now login with password: ${NEW_PASSWORD}\n`);

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('[MIGRATION] Error:', error);
        process.exit(1);
    }
}

resetAllPasswords();
