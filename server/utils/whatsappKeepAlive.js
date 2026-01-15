/**
 * WhatsApp Keep-Alive
 * 
 * Sends daily lightweight pings to connected WhatsApp sessions to prevent
 * timeout after prolonged inactivity. This ensures API works even after months.
 * 
 * Runs daily at 3 AM server time.
 */

import cron from 'node-cron';
import { clients } from '../controllers/whatsappController.js';

console.log('[KEEP-ALIVE] WhatsApp session keep-alive scheduler initialized');

// Run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
    console.log('[KEEP-ALIVE] 💚 Running daily session health check...');

    try {
        const { Business } = await import('../models/business.model.js');
        const { initializeClient } = await import('../controllers/whatsappController.js');

        // 🚀 CRITICAL FIX: Load sessions that are supposed to be connected but are missing from memory
        // This handles cases where the server restarted and sessions haven't been re-initialized yet.
        const connectedInDB = await Business.find({ sessionStatus: 'connected' });
        console.log(`[KEEP-ALIVE] Found ${connectedInDB.length} sessions marked as connected in DB.`);

        for (const business of connectedInDB) {
            const bId = business._id.toString();
            if (!clients[bId]) {
                console.log(`[KEEP-ALIVE] 🛠️  Auto-restoring session for ${bId} after restart...`);
                try {
                    await initializeClient(bId);
                    // Wait a bit for initialization to start before moving to next
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (e) {
                    console.error(`[KEEP-ALIVE] Failed to auto-restore ${bId}:`, e.message);
                }
            }
        }
    } catch (err) {
        console.error('[KEEP-ALIVE] Error during DB session restoration:', err.message);
    }

    let pingedCount = 0;
    let failedCount = 0;

    for (const [businessId, client] of Object.entries(clients)) {
        if (client.sock && client.status === 'ready') { // status is 'ready' when connected
            try {
                // Send lightweight presence update to keep session alive
                await client.sock.sendPresenceUpdate('available');
                pingedCount++;
                console.log(`[KEEP-ALIVE] ✅ Pinged session for business ${businessId}`);
            } catch (err) {
                failedCount++;
                console.error(`[KEEP-ALIVE] ❌ Failed to ping ${businessId}: ${err.message}`);
            }
        }
    }

    console.log(`[KEEP-ALIVE] Daily check complete. Pinged: ${pingedCount}, Failed: ${failedCount}`);
});

// Also run a weekly deeper check (Sundays at 2 AM)
cron.schedule('0 2 * * 0', async () => {
    console.log('[KEEP-ALIVE] \ud83d\udcca Running weekly session audit...');

    const sessionStats = {
        total: Object.keys(clients).length,
        connected: 0,
        disconnected: 0,
        initializing: 0
    };

    for (const [businessId, client] of Object.entries(clients)) {
        if (client.status === 'connected') sessionStats.connected++;
        else if (client.status === 'disconnected') sessionStats.disconnected++;
        else sessionStats.initializing++;
    }

    console.log('[KEEP-ALIVE] Weekly stats:', sessionStats);
});

export default {
    // Export for testing if needed
    runManualPing: async () => {
        console.log('[KEEP-ALIVE] Manual ping triggered');
        for (const [businessId, client] of Object.entries(clients)) {
            if (client.sock && client.status === 'connected') {
                await client.sock.sendPresenceUpdate('available');
            }
        }
    }
};
