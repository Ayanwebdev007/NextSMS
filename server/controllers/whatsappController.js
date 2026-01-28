import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from "@whiskeysockets/baileys";
import pino from "pino";

import asyncHandler from "express-async-handler";
import { Business } from "../models/business.model.js";
import { Activity } from "../models/activity.model.js";
import qrcode from "qrcode";
import fs from "fs";
import path from "path";
import os from "os";
import { SessionStore } from "../models/sessionStore.model.js";
import { BufferJSON } from "@whiskeysockets/baileys"; // Need BufferJSON to serialize/deserialize
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
});

redis.on("error", (err) => console.error("[REDIS] Connection Error:", err.message));
redis.on("connect", () => console.log("[REDIS] Connected for Session Caching"));

export const clients = {}; // { businessId: { sock, qr, status, reconnectAttempts, stableTimer, qrTimer, qrAttempt, lastActivity } }
const initializing = new Set();
const keyCache = {}; // { businessId: { type: { id: data } } }
const saveQueues = {}; // { businessId: Promise } - Sequential save queue

// 🛡️ GLOBAL NOISE SILENCER: Catch Baileys/libsignal errors that leak into console
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

const SILENCE_PATTERNS = ['Bad MAC', 'decrypt', 'SessionError', 'PreKeyError', 'transaction failed', 'skmsg', 'SessionRecordError', 'failed to decrypt', 'SessionEntry', 'registrationId', 'indexInfo', 'currentRatchet', 'pendingPreKey'];

// 🛡️ ULTRA-FAST TOTAL SILENCE: Drops noisy Baileys logs without CPU-heavy stringification
const SILENCE_GUARD = (...args) => {
    for (const arg of args) {
        if (typeof arg === 'string' && SILENCE_PATTERNS.some(p => arg.includes(p))) return true;
        if (typeof arg === 'object' && arg !== null) {
            if (arg.isSessionRecordError || arg.name === 'PreKeyError' || arg.registrationId || arg.remoteJid || arg._chains) return true;
        }
    }
    return false;
};

console.error = (...args) => { if (SILENCE_GUARD(...args)) return; originalConsoleError.apply(console, args); };
console.warn = (...args) => { if (SILENCE_GUARD(...args)) return; originalConsoleWarn.apply(console, args); };
console.log = (...args) => { if (SILENCE_GUARD(...args)) return; originalConsoleLog.apply(console, args); };
console.info = (...args) => { if (SILENCE_GUARD(...args)) return; originalConsoleInfo.apply(console, args); };

// 🧹 CACHE CLEANUP: Prevent memory bloat by clearing inactive key caches every hour
setInterval(() => {
    const now = Date.now();
    const INACTIVE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

    for (const businessId in keyCache) {
        const session = clients[businessId];
        if (!session || (now - (session.lastActivity || 0) > INACTIVE_TIMEOUT)) { // Added || 0 for safety
            console.log(`[CLEANUP] Clearing keyCache for inactive business: ${businessId}`);
            delete keyCache[businessId];
        }
    }
}, 60 * 60 * 1000); // Run every hour

const INSTANCE_ID = `${os.hostname()}-${process.pid}`;
const IDLE_TIMEOUT = 60 * 60 * 1000; // 60 minutes in milliseconds
console.log(`[SYSTEM] Instance ID: ${INSTANCE_ID}`);

/**
 * 💓 GLOBAL HEARTBEAT SYSTEM
 * Prevents "FORCE TAKEOVER" from ghost processes by updating the master lock
 * every 15 seconds for all active sessions in memory.
 */
setInterval(async () => {
    // STRAYED CHANGE: Include qr_pending, connecting, etc. to prevent lock expiration during slow sync
    const activeIds = Object.keys(clients).filter(id => {
        const status = clients[id]?.status;
        return status === 'ready' || status === 'qr_pending' || status === 'connecting' || !!clients[id]?.sock;
    });
    if (activeIds.length === 0) return;

    try {
        await SessionStore.updateMany(
            { businessId: { $in: activeIds }, masterId: INSTANCE_ID },
            { $set: { lastHeartbeat: new Date() } }
        );
    } catch (err) {
        console.error(`[HEARTBEAT] Failed to update locks:`, err.message);
    }
}, 5000); // 5s heartbeat (FAST for VPS stability)

/* =======================
   AUTH PATH
======================= */
const AUTH_PATH =
    process.env.NODE_ENV === "production" ? path.join(os.tmpdir(), "baileys_auth") : path.resolve("./.baileys_auth");

if (!fs.existsSync(AUTH_PATH)) {
    fs.mkdirSync(AUTH_PATH, { recursive: true });
}

/* =======================
   DB AUTH HELPERS
======================= */
/* =======================
   DB AUTH HELPERS
======================= */
const useMongoDBAuthState = async (businessId) => {
    // 1. Initial Read from DB (OPTIMIZED: Only creds)
    let creds;
    const existingSession = await SessionStore.findOne({ businessId }).select('data.creds businessEmail');

    if (existingSession && existingSession.data && existingSession.data.creds) {
        // Deserialize existing session from DB
        console.log(`[AUTH] Restoring session from DB for ${businessId}`);

        // 🛡️ NON-BLOCKING REPAIR: Surgically scrub bloat without freezing the VPS
        // If it's iconcomputer or data seems present, we check one specific small key to verify existence
        if (existingSession.businessEmail === "iconcomputer741126@gmail.com") {
            // Check for bloating keys without stringifying the whole object
            const keys = Object.keys(existingSession.data || {});
            if (keys.length > 2) { // More than just 'creds' and maybe one other
                console.warn(`[REPAIR] 🛠️  Business ${businessId} has extensive data. Executing Automatic Scrub...`);
                await SessionStore.updateOne(
                    { businessId },
                    { $set: { "data.pre-key": {}, "data.session": {}, "data.sender-key": {}, "data.app-state-sync-key-share": {} } }
                );
                // Return just the creds from what we already have (no Fresh JSON needed)
                creds = JSON.parse(JSON.stringify(existingSession.data.creds), BufferJSON.reviver);
            } else {
                creds = JSON.parse(JSON.stringify(existingSession.data.creds), BufferJSON.reviver);
            }
        } else {
            creds = JSON.parse(JSON.stringify(existingSession.data.creds), BufferJSON.reviver);
        }
    } else {
        // Initialize fresh credentials (no DB session exists)
        console.log(`[AUTH] Initializing fresh credentials for ${businessId}`);
        const { initAuthCreds } = await import("@whiskeysockets/baileys");
        creds = initAuthCreds();
    }

    // 2. Save Function (Accepts strictly sequential updates)
    // 🛡️ Sequential Write Guard: Ensure database writes are atomic and ordered
    const saveCreds = async (update) => {
        if (!saveQueues[businessId]) saveQueues[businessId] = Promise.resolve();

        // Chain the save operation to the business's unique queue
        saveQueues[businessId] = saveQueues[businessId].then(async () => {
            try {
                if (update && typeof update === 'object') {
                    Object.assign(creds, update);
                }

                await SessionStore.findOneAndUpdate(
                    { businessId: businessId },
                    {
                        $set: {
                            "data.creds": JSON.parse(JSON.stringify(creds, BufferJSON.replacer))
                        }
                    },
                    { upsert: true, new: true }
                );

                // Guard: Don't log success if we are disconnecting (prevents race confusion)
                if (!(clients[businessId]?.manualCleanup || clients[businessId]?.manualDisconnect)) {
                    console.log(`[AUTH] Credentials saved for ${businessId} (Sequential)`);
                }
            } catch (err) {
                console.error(`[AUTH] Failed sequential save for ${businessId}:`, err.message);
            }
        });

        return saveQueues[businessId];
    };

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    const missingIds = [];

                    // 1. Try Local Memory Cache first (SUPER FAST, 0 Redis Requests)
                    if (!keyCache[businessId]) keyCache[businessId] = {};
                    if (!keyCache[businessId][type]) keyCache[businessId][type] = {};

                    for (const id of ids) {
                        if (keyCache[businessId][type][id]) {
                            data[id] = keyCache[businessId][type][id];
                        } else {
                            missingIds.push(id);
                        }
                    }

                    if (missingIds.length === 0) return data;

                    // 🚀 FALLBACK: All keys now fetch from MongoDB (Redis sync removed to save costs)
                    const idsToFetchFromDB = [...missingIds];

                    // 3. Fallback to MongoDB for missing keys (OPTIMIZED: Using Projection)
                    if (idsToFetchFromDB.length > 0) {
                        const projection = {};
                        for (const id of idsToFetchFromDB) {
                            projection[`data.${type}.${id}`] = 1;
                        }

                        const session = await SessionStore.findOne({ businessId }, projection);
                        if (session?.data?.[type]) {
                            for (const id of idsToFetchFromDB) {
                                const val = session.data[type][id];
                                if (val) {
                                    data[id] = JSON.parse(JSON.stringify(val), BufferJSON.reviver);
                                    keyCache[businessId][type][id] = data[id];
                                }
                            }
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    try {
                        const updates = {};
                        const deletions = {};

                        if (!keyCache[businessId]) keyCache[businessId] = {};

                        for (const type in data) {
                            if (!keyCache[businessId][type]) keyCache[businessId][type] = {};

                            // 🧹 SESSION JANITOR: Prune excessive preKeys/sessions (ULTRA-AGGRESSIVE)
                            // If we have more than 100 items, keep latest 50. 
                            // This ensures the DB document is tiny (<100KB) and lightning fast.
                            const currentKeys = Object.keys(keyCache[businessId][type]);
                            if (currentKeys.length > 100 && (type === 'pre-key' || type === 'session' || type === 'sender-key')) {
                                const keysToRemove = currentKeys.slice(0, currentKeys.length - 50);
                                for (const k of keysToRemove) {
                                    delete keyCache[businessId][type][k];
                                    deletions[`data.${type}.${k}`] = 1;
                                }
                            }

                            for (const id in data[type]) {
                                const val = data[type][id];
                                const keyPath = `data.${type}.${id}`;

                                if (val) {
                                    const serialized = JSON.parse(JSON.stringify(val, BufferJSON.replacer));
                                    keyCache[businessId][type][id] = val;
                                    updates[keyPath] = serialized;
                                } else {
                                    delete keyCache[businessId][type][id];
                                    deletions[keyPath] = 1;
                                }
                            }
                        }

                        const operations = {};
                        if (Object.keys(updates).length > 0) operations.$set = updates;
                        if (Object.keys(deletions).length > 0) operations.$unset = deletions;

                        if (Object.keys(operations).length > 0) {
                            const bizId = businessId; // Closure safety
                            if (clients[bizId]?.manualCleanup || clients[bizId]?.manualDisconnect) return;

                            if (!saveQueues[bizId]) saveQueues[bizId] = Promise.resolve();
                            saveQueues[bizId] = saveQueues[bizId].then(async () => {
                                try {
                                    await SessionStore.updateOne({ businessId: bizId }, operations, { upsert: true });
                                } catch (err) {
                                    // If document is too large (16MB), emergency prune everything except creds
                                    if (err.message.includes('too large') || err.code === 10334) {
                                        console.error(`[CRITICAL] Session ${bizId} exceeds 16MB limit! Emergency purging non-essential keys...`);
                                        await SessionStore.updateOne(
                                            { businessId: bizId },
                                            { $set: { "data.pre-key": {}, "data.session": {}, "data.sender-key": {} } }
                                        );
                                    } else {
                                        console.error(`[AUTH] Background key save failed:`, err.message);
                                    }
                                }
                            });
                        }
                    } catch (err) {
                        console.error(`[AUTH] Failed to sync keys for ${businessId}:`, err.message);
                    }
                }
            }
        },
        saveCreds
    };
};

// Obsolete file helpers replaced by DB logic
const getSessionPath = (businessId) => path.join(AUTH_PATH, businessId); // Kept for temp init if needed
export const deleteSessionFolder = async (businessId) => {
    await SessionStore.deleteOne({ businessId });
    // Cleanup local FS just in case
    const sessionPath = getSessionPath(businessId);
    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
};

/* =======================
   CLEAN BROKEN SESSION (DB)
======================= */
const cleanBrokenSession = async (businessId) => {
    // ZERO DELETION POLICY: We intentionally do NOT delete the session even if it looks empty.
    // The user must manually disconnect.
    const session = await SessionStore.findOne({ businessId });
    if (session && (!session.data || !session.data.creds)) {
        console.warn(`[CLEANUP] Missing creds in DB for ${businessId}. Retaining record per Zero-Deletion policy.`);
        // await SessionStore.deleteOne({ businessId }); // DISABLED
    }
};

/* =======================
   MASTER LOCK SYSTEM
======================= */
// 🔒 SIMPLE LOCK SYSTEM: Just check if we own it or if it's stale
const acquireMasterLock = async (businessId) => {
    try {
        const now = new Date();
        const timeout = 120000; // 2 minutes (Generous timeout for stale locks)

        // 1. Try to acquire or update lock if we own it or if it's stale
        const result = await SessionStore.findOneAndUpdate(
            {
                businessId,
                $or: [
                    { masterId: null },
                    { masterId: INSTANCE_ID },
                    { lastHeartbeat: { $lt: new Date(now - timeout) } }
                ]
            },
            {
                $set: {
                    masterId: INSTANCE_ID,
                    lastHeartbeat: now
                }
            },
            { new: true, upsert: true, projection: { masterId: 1, businessEmail: 1 } }
        );

        if (result?.masterId === INSTANCE_ID) {
            // Self-healing: Populate email if missing
            if (result && !result.businessEmail) {
                const business = await Business.findById(businessId).select('email');
                if (business) {
                    await SessionStore.updateOne({ _id: result._id }, { $set: { businessEmail: business.email } });
                }
            }
            return true;
        }

        return false;
    } catch (err) {
        console.error(`[LOCK] [${INSTANCE_ID}] Lock error:`, err.message);
        return false;
    }
};

// Heartbeat for active sessions + Idle Disconnect
setInterval(async () => {
    const now = new Date();
    const IDLE_TIMEOUT = 60 * 60 * 1000; // 60 minutes

    for (const businessId in clients) {
        const client = clients[businessId];

        // 1. Heartbeat for locked sessions
        if (client.status === "ready") {
            try {
                await SessionStore.updateOne(
                    { businessId, masterId: INSTANCE_ID },
                    { $set: { lastHeartbeat: now } }
                );
            } catch (e) { }
        }

        // 2. RAM OPTIMIZATION: Disconnect idle sessions
        // If not sent a message in 1 hour and no active worker job for this client
        const lastActivity = client.lastMessageAt || client.initAt || 0;
        if (client.status === "ready" && (now - lastActivity) > IDLE_TIMEOUT) {
            console.log(`[IDLE] 💤 Session ${businessId} inactive for 60m. Offloading from RAM...`);
            if (client.sock) {
                client.sock.manualCleanup = true;
                try { client.sock.end(); } catch (e) { }
            }
            delete clients[businessId];
            initializing.delete(businessId);
        }
    }
}, 30000); // Check every 30s

/* =======================
   RESTORE SESSIONS
======================= */
// --- SCALABILITY: Staggered Auto-Restore ---
// We load all previously connected sessions automatically, 
// but we stagger them to avoid CPU/RAM spikes.
export const restoreSessions = async () => {
    try {
        const connectedBusinesses = await Business.find({ sessionStatus: 'connected' });
        console.log(`[STARTUP] Found ${connectedBusinesses.length} sessions to restore auto-reconnect.`);

        // Use a staggered loop to avoid hitting Baileys with 100+ requests at once
        connectedBusinesses.forEach((biz, index) => {
            setTimeout(() => {
                console.log(`[AUTO-RESTORE] Waking up session for ${biz.email || biz._id}...`);
                initializeClient(biz._id.toString());
            }, index * 3000); // 3 seconds apart
        });
    } catch (err) {
        console.error('[STARTUP] Failed to restore sessions:', err.message);
    }
};

// --- RAM OPTIMIZATION: Idle Cleanup Loop ---
// Periodically checks for sessions that haven't sent a message and removes them from RAM.
setInterval(() => {
    const now = Date.now();
    const activeIds = Object.keys(clients);

    activeIds.forEach(businessId => {
        const client = clients[businessId];
        // Only unload if it's been idle for 60m AND we are not in the middle of a task
        if (client && client.lastActivity && (now - client.lastActivity) > IDLE_TIMEOUT) {
            console.log(`[RAM-CLEANUP] Unloading idle session ${businessId} (Idle for ${Math.floor((now - client.lastActivity) / 60000)}m)`);

            if (client.sock) {
                client.sock.manualCleanup = true;
                try { client.sock.end(); } catch (e) { }
            }
            delete clients[businessId];
        }
    });
}, 5 * 60 * 1000); // Check every 5 minutes

/* =======================
   INITIALIZE CLIENT
======================= */
export const initializeClient = async (businessId) => {
    // SYNC GUARD: Prevent racing initializations
    if (clients[businessId]?.status === "ready" || clients[businessId]?.sock) {
        console.log(`[WhatsApp] Socket already exists for ${businessId}, skipping init.`);
        initializing.delete(businessId);
        return;
    }
    if (initializing.has(businessId)) {
        console.log(`[WhatsApp] Already initializing ${businessId}, skipping duplicate call.`);
        return;
    }

    initializing.add(businessId);

    // 🛡️ EMERGENCY TIMEOUT: If init hangs for >120s, clear the guard
    setTimeout(() => {
        if (initializing.has(businessId)) {
            console.warn(`[WhatsApp] Init safety timeout reached for ${businessId}. Clearing guard.`);
            initializing.delete(businessId);
        }
    }, 120000); // 2 minutes (Gives Baileys plenty of time to restore)

    console.log(`[WhatsApp] Initializing socket for ${businessId}...`);

    // Corrected Guard: If already connecting or active, don't start a second one
    const existingSession = clients[businessId];
    if (existingSession) {
        if (existingSession.status === "ready") {
            initializing.delete(businessId);
            return;
        }

        console.log(`[WhatsApp] Cleaning up old socket for ${businessId} before re-init`);
        if (existingSession.sock) {
            existingSession.sock.manualCleanup = true;
            try { existingSession.sock.end(); } catch (e) { }
        }
    }

    // 🔒 MASTER LOCK CHECK
    const hasLock = await acquireMasterLock(businessId);
    if (!hasLock) {
        console.error(`[LOCK] [${INSTANCE_ID}] Aborted init for ${businessId} - Managed by another server.`);
        initializing.delete(businessId);
        return;
    }

    // Fetch persistent state
    const sessionEntry = await SessionStore.findOne({ businessId });
    const dbAttempts = sessionEntry?.reconnectAttempts || 0;

    try {
        const { state, saveCreds } = await useMongoDBAuthState(businessId);

        const sock = makeWASocket({
            auth: state,
            // 🛡️ DEEP-SILENCE LOGGER: Catch noise before it ever reaches stdout
            logger: pino({
                level: "silent", // COMPLETELY SILENT (Production standard for high-volume)
            }),
            browser: Browsers.ubuntu("Chrome"), // Matches existing session
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 90000,
            keepAliveIntervalMs: 15000,
            retryRequestDelayMs: 5000,
            // 🛡️ HIGH-VOLUME ISOLATION: Stop history sync for sending-only accounts
            // This reduces CPU/RAM usage by 90% for active accounts like iconcomputer
            syncFullHistory: false,
            markOnlineOnConnect: false
        });

        // PRESERVE reconnectAttempts from memory or DB
        const prevAttempts = existingSession?.reconnectAttempts || dbAttempts;

        const session = {
            sock,
            qr: null,
            status: "initializing",
            reconnectAttempts: prevAttempts,
            lastActivity: Date.now(), // Initialize activity timestamp
            initAt: new Date(),
            lastMessageAt: new Date()
        };
        clients[businessId] = session;
        // initializing.delete(businessId); // This was moved to connection.update and catch block

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // Initialize QR attempt counter if not exists
                if (!session.qrAttempt) session.qrAttempt = 0;
                session.qrAttempt++;

                // Track exactly when this QR will expire for frontend sync
                session.qrExpireAt = Date.now() + 10000;

                const MAX_QR_ATTEMPTS = 3;
                console.log(`[WhatsApp] QR #${session.qrAttempt}/${MAX_QR_ATTEMPTS} generated for ${businessId}`);

                session.qr = await qrcode.toDataURL(qr);
                session.status = "qr_pending";

                await Business.findByIdAndUpdate(businessId, {
                    sessionStatus: "qr_pending",
                    qrAttempt: session.qrAttempt
                });

                // Clear previous QR timer if exists
                if (session.qrTimer) {
                    clearTimeout(session.qrTimer);
                    session.qrTimer = null;
                }

                // If max attempts reached, set final timeout then stop
                if (session.qrAttempt >= MAX_QR_ATTEMPTS) {
                    console.log(`[WhatsApp] Max QR attempts (${MAX_QR_ATTEMPTS}) reached for ${businessId}. Will expire in 10s.`);
                    session.qrTimer = setTimeout(async () => {
                        if (session.status === 'qr_pending') {
                            console.log(`[WhatsApp] QR expired for ${businessId} after ${MAX_QR_ATTEMPTS} attempts`);
                            session.status = 'qr_expired';
                            session.qr = null;
                            session.qrAttempt = 0;

                            await Business.findByIdAndUpdate(businessId, {
                                sessionStatus: 'qr_expired',
                                qrAttempt: 0
                            });

                            // Clean up socket
                            try {
                                sock.manualCleanup = true;
                                sock.end();
                            } catch (e) { }

                            delete clients[businessId];
                            initializing.delete(businessId);
                        }
                    }, 10000); // 10 second grace period for final QR
                    return;
                }

                // Set 10-second timer to force new QR generation
                session.qrTimer = setTimeout(() => {
                    if (session.status === 'qr_pending') {
                        console.log(`[WhatsApp] QR timeout (10s), forcing regeneration for ${businessId}`);
                        // Force WhatsApp SDK to generate new QR by closing and reopening connection
                        try {
                            if (sock.ws) {
                                sock.ws.close();
                            }
                        } catch (e) {
                            console.error(`[WhatsApp] Error forcing QR regeneration: ${e.message}`);
                        }
                    }
                }, 10000); // 10 seconds
            }

            if (connection === "open") {
                console.log(`[WhatsApp] Connection opened for ${businessId}`);

                // Clear QR timer on successful connection
                if (session.qrTimer) {
                    clearTimeout(session.qrTimer);
                    session.qrTimer = null;
                }

                // Reset QR attempt counter
                session.qrAttempt = 0;

                // Clear any existing stability timer
                if (session.stableTimer) clearTimeout(session.stableTimer);

                session.status = "ready";
                session.qr = null;
                initializing.delete(businessId); // Clear initializing set on successful connection

                await Business.findByIdAndUpdate(businessId, {
                    sessionStatus: "connected",
                    qrAttempt: 0
                });

                // Stable Reset: Only clear attempts if we stay connected for 5s (Faster stability check)
                session.stableTimer = setTimeout(async () => {
                    console.log(`[WhatsApp] [STABLE] Session ${businessId} has stayed open for 5s. Resetting backoff.`);
                    session.reconnectAttempts = 0;
                    session.unstableCount = 0; // Reset instability counter
                    try {
                        await SessionStore.updateOne({ businessId }, { $set: { reconnectAttempts: 0 } });
                    } catch (e) { }
                }, 5000);

                // Presence update to keep alive
                try {
                    await sock.sendPresenceUpdate("available");
                } catch (e) { }

                await Activity.create({
                    businessId,
                    event: 'connected',
                    details: 'WhatsApp session linked successfully'
                });
            }

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const isConflict = statusCode === 440;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;

                if (session.qrTimer) { clearTimeout(session.qrTimer); session.qrTimer = null; }
                if (session.stableTimer) { clearTimeout(session.stableTimer); session.stableTimer = null; }

                if (sock.manualCleanup) {
                    console.log(`[WhatsApp] Skipping reconnect for ${businessId} (Intentional cleanup)`);
                    return;
                }

                console.warn(`[WhatsApp] Close [${businessId}] Status: ${statusCode || 'unknown'}, UnstableCount: ${session.unstableCount || 0}, Conflict: ${isConflict}`);

                if (isLoggedOut) {
                    console.error(`[WhatsApp] Permanent logout for ${businessId}. Wiping session.`);
                    delete clients[businessId];
                    initializing.delete(businessId);
                    deleteSessionFolder(businessId);
                    await Business.findByIdAndUpdate(businessId, { sessionStatus: "disconnected" });
                    return;
                }

                // 🕵️ STABILITY TRACKER: detecting "Death Loops"
                if (!isConflict) {
                    session.unstableCount = (session.unstableCount || 0) + 1;
                    if (session.unstableCount >= 5) {
                        console.error(`[WhatsApp] 💀 Session ${businessId} in DEATH LOOP (5 rapid disconnects). Forcing wipe.`);
                        delete clients[businessId];
                        initializing.delete(businessId);
                        deleteSessionFolder(businessId);
                        await Business.findByIdAndUpdate(businessId, { sessionStatus: "disconnected" });
                        return;
                    }
                }

                const nextAttempts = (session.reconnectAttempts || 0) + 1;
                session.reconnectAttempts = nextAttempts;
                await SessionStore.updateOne({ businessId }, { $set: { reconnectAttempts: nextAttempts } });

                if (isConflict) {
                    console.warn(`[WhatsApp] [${INSTANCE_ID}] 440 Conflict for ${businessId}. Allowing Master Lock to resolve...`);
                } else if (nextAttempts >= 10) {
                    console.error(`[WhatsApp] Max reconnect attempts (10) reached for ${businessId}. Stopping retry loop.`);
                    delete clients[businessId];
                    initializing.delete(businessId);
                    await Business.findByIdAndUpdate(businessId, { sessionStatus: "disconnected" });
                    return;
                }

                const baseDelay = isConflict ? 15000 : 2000;
                const backoff = Math.min(Math.pow(2, Math.min(nextAttempts, 6)) * baseDelay, 60000);
                const delay = backoff + (Math.random() * 5000);

                console.log(`[WhatsApp] Retrying ${businessId} in ${(delay / 1000).toFixed(1)}s (Attempt: ${nextAttempts}${isConflict ? ' - CONFLICT LOOP' : ''})`);

                session.status = "disconnected";
                initializing.delete(businessId);

                if (!session.retryActive) {
                    session.retryActive = true;
                    setTimeout(() => {
                        session.retryActive = false;
                        console.log(`[WhatsApp] Retry timer fired for ${businessId}. Re-initializing...`);
                        initializeClient(businessId);
                    }, delay);
                }
            }
        });

        /* -------- MESSAGES (Auto-Responder) -------- */
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify") return;

            // 📊 Update activity for idle timeout
            if (clients[businessId]) {
                clients[businessId].lastActivity = Date.now();
                clients[businessId].lastMessageAt = new Date();
                clients[businessId].badMacCount = 0; // Reset error count on success
            }

            for (const msg of messages) {
                if (!msg.message || msg.key.fromMe) continue;
                const buttonResponse = msg.message.buttonsResponseMessage;
                if (buttonResponse) {
                    const selectedId = buttonResponse.selectedButtonId;
                    const sender = msg.key.remoteJid;
                    if (selectedId && selectedId.includes('_')) {
                        const [campaignId, buttonIndex] = selectedId.split('_');
                        try {
                            const { Campaign } = await import("../models/campaign.model.js");
                            const campaign = await Campaign.findById(campaignId);
                            if (campaign && campaign.buttons && campaign.buttons[buttonIndex]) {
                                const replyText = campaign.buttons[buttonIndex].reply;
                                await sock.sendMessage(sender, { text: replyText });
                                await Activity.create({
                                    businessId,
                                    event: 'auto_reply_sent',
                                    details: `Sent auto-reply to ${sender}`
                                });
                            }
                        } catch (err) {
                            console.error("[AUTO-REPLY] Error:", err.message);
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error(`[WhatsApp] Init error for ${businessId}:`, err.message);
        delete clients[businessId];
        initializing.delete(businessId);
    }
};

/* =======================
   API: CONNECT SESSION
======================= */
export const connectSession = asyncHandler(async (req, res) => {
    const businessId = req.business._id.toString();

    // Check if already connected
    if (clients[businessId]) {
        if (clients[businessId].status === "ready") {
            return res.status(409).json({ message: "Session already connected" });
        }
        // If it's already initializing but the user clicked connect again, kill the old one
        if (clients[businessId].sock) {
            clients[businessId].sock.manualCleanup = true; // Ensure no reconnect loop
            try { clients[businessId].sock.end(); } catch (e) { }
        }
        delete clients[businessId];
        initializing.delete(businessId); // CLEAR THE GUARD
    }

    // ZERO-DELETION POLICY: Do NOT wipe existing session data
    // Only delete if explicitly requested via query param (e.g., ?fresh=true)
    if (req.query.fresh === 'true') {
        console.log(`[CONNECT] Fresh connection requested for ${businessId}. Wiping old session.`);
        await deleteSessionFolder(businessId);
    } else {
        console.log(`[CONNECT] Attempting to restore/reconnect existing session for ${businessId}`);
    }

    initializeClient(businessId);

    let attempts = 0;
    const timer = setInterval(() => {
        if (clients[businessId]?.qr) {
            clearInterval(timer);
            return res.json({
                qrCodeUrl: clients[businessId].qr,
                qrAttempt: clients[businessId].qrAttempt || 0,
                qrExpireAt: clients[businessId].qrExpireAt || (Date.now() + 10000)
            });
        }

        if (++attempts > 30) {
            clearInterval(timer);
            return res.status(408).json({ message: "QR generation timeout" });
        }
    }, 2000);
});

/* =======================
   API: SESSION STATUS
======================= */
export const getSessionStatus = asyncHandler(async (req, res) => {
    const businessId = req.business._id.toString();
    const client = clients[businessId];

    // Priority 1: In-memory active sessions
    if (client?.status === "ready") {
        return res.json({ status: "connected" });
    }

    // --- SCALABILITY: Lazy loading on dashboard visit ---
    if (!client && !initializing.has(businessId)) {
        const business = await Business.findById(businessId);
        const statusInDB = business?.sessionStatus || "disconnected";

        // ONLY wake up if the business is supposed to be connected
        if (statusInDB === "connected") {
            const hasSessionInDB = await SessionStore.findOne({ businessId });
            if (hasSessionInDB && hasSessionInDB.data && hasSessionInDB.data.creds) {
                console.log(`[LAZY-LOAD] Waking up session for ${businessId} via dashboard view...`);
                initializeClient(businessId);
                return res.json({ status: "initializing" });
            }
        }
    }

    // Priority 2: In-memory QR codes
    if (client?.qr) {
        return res.json({
            status: "qr_pending",
            qrCodeUrl: client.qr,
            qrAttempt: client.qrAttempt || 0,
            qrExpireAt: client.qrExpireAt || (Date.now() + 10000)
        });
    }

    // Priority 3: Ongoing initialization
    if (client) {
        return res.json({ status: "initializing" });
    }

    // Priority 4: Database fallback (with reality check)
    const business = await Business.findById(businessId);
    let status = business?.sessionStatus || "disconnected";

    if (status === "connected") {
        // If it's supposed to be connected but not in memory, 
        // check if it's because it's being restored or if it's dead.

        // CHECK DB PERSISTENCE instead of FS
        const sessionStore = await SessionStore.findOne({ businessId });
        if (sessionStore && sessionStore.data && sessionStore.data.creds) {
            // It exists in DB, so it will be restored.
            return res.json({ status: "initializing" });
        } else {
            // No record in DB? It's gone.
            return res.json({ status: "disconnected" });
        }
    }

    // If it was just a QR scan pending, and it's not in memory, it's effectively disconnected now.
    if (status === "qr_pending") {
        return res.json({ status: "disconnected" });
    }

    return res.json({ status });
});

/* =======================
   API: DISCONNECT SESSION
======================= */
export const disconnectSession = asyncHandler(async (req, res) => {
    const businessId = req.business._id.toString();
    const client = clients[businessId];

    if (client) {
        client.manualDisconnect = true;

        if (client.sock) {
            client.sock.manualCleanup = true; // CRITICAL: Stop reconnection loop
            try {
                await client.sock.logout();
            } catch (e) {
                console.warn(
                    `[LOGOUT] Error during logout for ${businessId}:`,
                    e?.message
                );
            }
        }
        delete clients[businessId];
    }

    // Ensure guard is cleared
    initializing.delete(businessId);
    deleteSessionFolder(businessId);

    await Business.findByIdAndUpdate(businessId, {
        sessionStatus: "disconnected",
    });

    await Activity.create({
        businessId,
        event: 'disconnected',
        details: 'Manual disconnection: User opted to disconnect the session'
    });

    res.json({ message: "Disconnected successfully" });
});
