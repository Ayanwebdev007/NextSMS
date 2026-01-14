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

export const clients = {}; // businessId -> { sock, qr, status }
const initializing = new Set();
const INSTANCE_ID = `${os.hostname()}-${process.pid}`;
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
const useMongoDBAuthState = async (businessId) => {
    // 1. Initial Read from DB
    let creds;
    let keys = {};
    const existingSession = await SessionStore.findOne({ businessId });

    if (existingSession && existingSession.data && existingSession.data.creds) {
        // Deserialize existing session from DB
        console.log(`[AUTH] Restoring session from DB for ${businessId}`);
        creds = JSON.parse(JSON.stringify(existingSession.data.creds), BufferJSON.reviver);

        // Restore keys if they exist
        if (existingSession.data.keys) {
            keys = existingSession.data.keys;
        }
    } else {
        // Initialize fresh credentials (no DB session exists)
        console.log(`[AUTH] Initializing fresh credentials for ${businessId}`);
        const { initAuthCreds } = await import("@whiskeysockets/baileys");
        creds = initAuthCreds();
    }

    // 2. Save Function
    const saveCreds = async () => {
        try {
            const result = await SessionStore.findOneAndUpdate(
                { businessId: businessId }, // businessId is already an ObjectId from the parameter
                {
                    $set: {
                        "data.creds": JSON.parse(JSON.stringify(creds, BufferJSON.replacer))
                    }
                },
                { upsert: true, new: true }
            );
            console.log(`[AUTH] Credentials saved to DB for ${businessId}`);
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
                    const session = await SessionStore.findOne({ businessId });
                    const data = {};
                    if (session?.data?.[type]) {
                        for (const id of ids) {
                            const val = session.data[type][id];
                            if (val) {
                                data[id] = JSON.parse(JSON.stringify(val), BufferJSON.reviver);
                            }
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    try {
                        const updateOps = {};
                        for (const type in data) {
                            for (const id in data[type]) {
                                const val = data[type][id];
                                if (val) {
                                    updateOps[`data.${type}.${id}`] = JSON.parse(JSON.stringify(val, BufferJSON.replacer));
                                } else {
                                    updateOps[`data.${type}.${id}`] = null; // Mark for deletion/nulling
                                }
                            }
                        }

                        if (Object.keys(updateOps).length > 0) {
                            await SessionStore.findOneAndUpdate(
                                { businessId },
                                { $set: updateOps },
                                { upsert: true }
                            );
                            console.log(`[AUTH] Atomic keys updated in DB for ${businessId}`);
                        }
                    } catch (err) {
                        console.error(`[AUTH] Failed to save keys for ${businessId}:`, err.message);
                        throw err;
                    }
                }
            }
        },
        saveCreds
    };
};

// Obsolete file helpers replaced by DB logic
const getSessionPath = (businessId) => path.join(AUTH_PATH, businessId); // Kept for temp init if needed
const deleteSessionFolder = async (businessId) => {
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
                session = await SessionStore.create({
                    businessId,
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
            return true;
        }

        // 4. HIJACK LOGIC: If ownership is from the same host, take it forcefully
        const currentMaster = await SessionStore.findOne({ businessId });
        if (currentMaster?.masterId) {
            const [masterHostname] = currentMaster.masterId.split('-');
            const [myHostname] = INSTANCE_ID.split('-');

            if (masterHostname === myHostname) {
                console.warn(`[LOCK] [${INSTANCE_ID}] FORCE TAKEOVER from same-host: ${currentMaster.masterId}`);
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

// Heartbeat for active sessions
setInterval(async () => {
    const activeBusinessIds = Object.keys(clients).filter(id => clients[id].status === "ready");
    for (const businessId of activeBusinessIds) {
        try {
            await SessionStore.updateOne(
                { businessId, masterId: INSTANCE_ID },
                { $set: { lastHeartbeat: new Date() } }
            );
        } catch (e) { }
    }
}, 10000); // 10s heartbeat

/* =======================
   RESTORE SESSIONS
======================= */
export const restoreSessions = async () => {
    // console.log("[SESSION RESTORE] Checking saved Baileys sessions in DB");

    // Fetch all active sessions from DB
    const storedSessions = await SessionStore.find({}, '_id businessId');

    for (const session of storedSessions) {
        const businessId = session.businessId.toString();
        // cleanBrokenSession(businessId); // Usually handled by connection logic
        initializeClient(businessId);
    }
};

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
            reconnectAttempts: prevAttempts
        };
        clients[businessId] = session;
        // initializing.delete(businessId); // This was moved to connection.update and catch block

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(`[WhatsApp] New QR generated for ${businessId}`);
                session.qr = await qrcode.toDataURL(qr);
                session.status = "qr_pending";
                await Business.findByIdAndUpdate(businessId, { sessionStatus: "qr_pending" });
            }

            if (connection === "open") {
                console.log(`[WhatsApp] Connection opened for ${businessId}`);

                // Clear any existing stability timer
                if (session.stableTimer) clearTimeout(session.stableTimer);

                session.status = "ready";
                session.qr = null;
                initializing.delete(businessId); // Clear initializing set on successful connection

                await Business.findByIdAndUpdate(businessId, { sessionStatus: "connected" });

                // Stable Reset: Only clear attempts if we stay connected for 30s
                session.stableTimer = setTimeout(async () => {
                    console.log(`[WhatsApp] [STABLE] Session ${businessId} has stayed open for 30s. Resetting backoff.`);
                    session.reconnectAttempts = 0;
                    try {
                        await SessionStore.updateOne({ businessId }, { $set: { reconnectAttempts: 0 } });
                    } catch (e) { }
                }, 30000);

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
                        console.warn(`[WhatsApp] [${INSTANCE_ID}] 440 Conflict for ${businessId}. Retrying without modifications...`);
                    }

                    const baseDelay = isConflict ? 10000 : 2000;
                    const delay = Math.min(Math.pow(2, Math.min(nextAttempts, 6)) * baseDelay, 90000);

                    console.log(`[WhatsApp] Retrying ${businessId} in ${delay / 1000}s... (Attempt: ${nextAttempts})`);

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
            return res.json({ qrCodeUrl: clients[businessId].qr });
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

    // Priority 2: In-memory QR codes
    if (client?.qr) {
        return res.json({
            status: "qr_pending",
            qrCodeUrl: client.qr
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
