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
    // 1. Initial Read from DB
    let creds;
    const existingSession = await SessionStore.findOne({ businessId });

    if (existingSession && existingSession.data && existingSession.data.creds) {
        // Deserialize existing session from DB
        console.log(`[AUTH] Restoring session from DB for ${businessId}`);
        creds = JSON.parse(JSON.stringify(existingSession.data.creds), BufferJSON.reviver);
    } else {
        // Initialize fresh credentials (no DB session exists)
        console.log(`[AUTH] Initializing fresh credentials for ${businessId}`);
        const { initAuthCreds } = await import("@whiskeysockets/baileys");
        creds = initAuthCreds();
    }

    // 2. Save Function (Accepts partial updates)
    const saveCreds = async (update) => {
        try {
            if (update && typeof update === 'object') {
                Object.assign(creds, update);
            }

            const result = await SessionStore.findOneAndUpdate(
                { businessId: businessId },
                {
                    $set: {
                        "data.creds": JSON.parse(JSON.stringify(creds, BufferJSON.replacer))
                    }
                },
                { upsert: true, new: true }
            );

            console.log(`[AUTH] Credentials saved for ${businessId}`);
            return result;
        } catch (err) {
            console.error(`[AUTH] Failed to save credentials for ${businessId}:`, err.message);
            throw err;
        }
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

                    // 3. Fallback to MongoDB for missing keys
                    if (idsToFetchFromDB.length > 0) {
                        const session = await SessionStore.findOne({ businessId });
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
                            const isCreds = type === 'creds';

                            for (const id in data[type]) {
                                const val = data[type][id];
                                const keyPath = `data.${type}.${id}`;
                                const redisKey = `auth:${businessId}:${type}:${id}`;

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
                            // Update MongoDB (Persistent) - Background
                            SessionStore.updateOne({ businessId }, operations, { upsert: true }).catch(err => {
                                console.error(`[AUTH] Background key save failed for ${businessId}:`, err.message);
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
const acquireMasterLock = async (businessId) => {
    try {
        const now = new Date();
        const timeout = 30000; // 30 seconds takeover for stale locks

        // 1. First, check if the session entry exists
        let session = await SessionStore.findOne({ businessId });

        // 2. If it doesn't exist, try to create it (handles E11000 race condition)
        if (!session) {
            try {
                const business = await Business.findById(businessId).select('email');
                session = await SessionStore.create({
                    businessId,
                    businessEmail: business?.email || 'unknown',
                    masterId: INSTANCE_ID,
                    lastHeartbeat: now
                });
                return true;
            } catch (err) {
                if (err.code === 11000) {
                    // Conflict: someone else created it during our call. Proceed to update.
                    session = await SessionStore.findOne({ businessId });
                } else throw err;
            }
        }

        // 3. Try to acquire the lock atomically
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
            { new: true }
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

        // 4. HIJACK LOGIC: If ownership is from the same host, take it forcefully
        const currentMaster = await SessionStore.findOne({ businessId });
        if (currentMaster?.masterId) {
            const [masterHostname] = currentMaster.masterId.split('-');
            const [myHostname] = INSTANCE_ID.split('-');

            if (masterHostname === myHostname) {
                console.warn(`[LOCK] [${INSTANCE_ID}] FORCE TAKEOVER from same-host: ${currentMaster.masterId}`);

                // 💀 GHOST KILLER: Extract PID and kill the zombie process
                // Format: hostname-PID (e.g., srv123-45678)
                try {
                    const ghostPid = currentMaster.masterId.split('-').pop();
                    if (ghostPid && !isNaN(ghostPid)) {
                        const { exec } = await import('child_process');
                        console.log(`[LOCK] 💀 Executing TARGETED KILL on zombie PID: ${ghostPid}`);
                        exec(`kill -9 ${ghostPid}`, (err) => {
                            if (err) console.log(`[LOCK] Kill result: ${err.message}`);
                            else console.log(`[LOCK] Zombie ${ghostPid} eliminated.`);
                        });
                    }
                } catch (kErr) {
                    console.error(`[LOCK] Failed to kill zombie: ${kErr.message}`);
                }

                await SessionStore.findOneAndUpdate(
                    { businessId },
                    {
                        $set: {
                            masterId: INSTANCE_ID,
                            lastHeartbeat: now
                        }
                    }
                );
                return true; // We took it forcefully
            }
        }

        console.warn(`[LOCK] [${INSTANCE_ID}] Rejected - Controlled by: ${currentMaster?.masterId || 'unknown'}`);
        return false;
    } catch (err) {
        console.error(`[LOCK] [${INSTANCE_ID}] Critical error:`, err.message);
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
// --- SCALABILITY: Lazy Restore ---
// We no longer load all sessions at startup (to save RAM/CPU).
// Sessions will "Wake Up" on-demand when someone uses the API or Dashboard.
export const restoreSessions = async () => {
    console.log("[LAZY-LOAD] Startup complete. Sessions will load on-demand.");
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
    if (clients[businessId]?.status === "ready") return;
    if (initializing.has(businessId)) {
        console.log(`[WhatsApp] Already initializing ${businessId}, skipping duplicate call.`);
        return;
    }

    initializing.add(businessId);
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
            logger: pino({ level: "silent" }),
            browser: Browsers.ubuntu("Chrome"), // Matches existing session
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            retryRequestDelayMs: 2000
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

                // Clear QR timer if connection closed
                if (session.qrTimer) {
                    clearTimeout(session.qrTimer);
                    session.qrTimer = null;
                }

                // 1. If it was an intentional cleanup, don't reconnect
                if (sock.manualCleanup) {
                    console.log(`[WhatsApp] Skipping reconnect for ${businessId} (Intentional cleanup)`);
                    return;
                }

                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.warn(`[WhatsApp] Connection closed for ${businessId}. Status: ${statusCode || 'unknown'}. Reconnect: ${shouldReconnect}`);

                if (shouldReconnect) {
                    const sessionState = clients[businessId] || { reconnectAttempts: 0 };

                    // Clear stability timer if it was running
                    if (sessionState.stableTimer) clearTimeout(sessionState.stableTimer);

                    const nextAttempts = (sessionState.reconnectAttempts || 0) + 1;

                    // Persist attempts to DB so restart doesn't reset backoff
                    await SessionStore.updateOne({ businessId }, { $set: { reconnectAttempts: nextAttempts } });

                    // ABSOLUTE ZERO-WIPE: No longer resetting keys on 440.
                    // Just log it and rely on the Master Lock to eventually resolve the conflict.
                    const isConflict = statusCode === 440;
                    if (isConflict) {
                        console.warn(`[WhatsApp] [${INSTANCE_ID}] 440 Conflict for ${businessId}. Waiting 15s to let other instance die...`);
                    }

                    // CRITICAL FIX: Infinite Retry for 440 Conflicts
                    // If we are fighting for control (440), we must NOT give up.
                    // The "other" session will eventually timeout or be killed by fuser.
                    if (!isConflict && nextAttempts >= 10) {
                        console.error(`[WhatsApp] Max reconnect attempts (10) reached for ${businessId}. Stopping retry loop.`);
                        delete clients[businessId];
                        initializing.delete(businessId);
                        await Business.findByIdAndUpdate(businessId, { sessionStatus: "disconnected" });
                        return;
                    }

                    const baseDelay = isConflict ? 15000 : 2000; // 15s delay for conflicts
                    const backoff = Math.min(Math.pow(2, Math.min(nextAttempts, 6)) * baseDelay, 60000);

                    // 🚀 ADD JITTER: Prevent "Thundering Herd" or synchronized retry loops
                    const jitter = Math.random() * 5000;
                    const delay = backoff + jitter;

                    console.log(`[WhatsApp] Retrying ${businessId} in ${(delay / 1000).toFixed(1)}s (inc. ${(jitter / 1000).toFixed(1)}s jitter)... (Attempt: ${nextAttempts}${isConflict ? ' - CONFLICT LOOP' : '/10'})`);

                    clients[businessId] = {
                        ...sessionState,
                        status: "disconnected",
                        reconnectAttempts: nextAttempts
                    };

                    initializing.delete(businessId);
                    setTimeout(() => initializeClient(businessId), delay);
                } else {
                    console.error(`[WhatsApp] Permanent logout for ${businessId}. Session preserved.`);
                    delete clients[businessId];
                    initializing.delete(businessId);
                    await Business.findByIdAndUpdate(businessId, { sessionStatus: "disconnected" });

                    await Activity.create({
                        businessId,
                        event: 'auth_failure',
                        details: 'Session logged out from phone.'
                    });
                }
            }
        });

        /* -------- MESSAGES (Auto-Responder) -------- */
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify") return;

            // 📊 Update activity for idle timeout
            if (clients[businessId]) {
                clients[businessId].lastMessageAt = new Date();
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
            try { clients[businessId].sock.end(); } catch (e) { }
        }
        delete clients[businessId];
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
        const hasSessionInDB = await SessionStore.findOne({ businessId });
        if (hasSessionInDB) {
            console.log(`[LAZY-LOAD] Waking up session for ${businessId} via dashboard view...`);
            initializeClient(businessId);
            return res.json({ status: "initializing" });
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

    // deleted initializing reference
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
