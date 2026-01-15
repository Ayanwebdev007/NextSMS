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
    console.log('[KEEP-ALIVE] \ud83d\udc9a Running daily session health check...');

    let pingedCount = 0;
    let failedCount = 0;

    for (const [businessId, client] of Object.entries(clients)) {
        if (client.sock && client.status === 'connected') {
            try {
                // Send lightweight presence update to keep session alive
                await client.sock.sendPresenceUpdate('available');
                pingedCount++;
                console.log(`[KEEP-ALIVE] ✅ Pinged session for business ${businessId}`);
            } catch (err) {
                failedCount++;
                console.error(`[KEEP-ALIVE] ❌ Failed to ping ${businessId}:`, err.message);
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
