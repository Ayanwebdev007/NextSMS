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
const connectionTimers = {}; // businessId -> timeoutId

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
                        const session = await SessionStore.findOne({ businessId });
                        const currentData = session?.data || {};

                        for (const type in data) {
                            if (!currentData[type]) currentData[type] = {};
                            for (const id in data[type]) {
                                const val = data[type][id];
                                if (val) {
                                    currentData[type][id] = JSON.parse(JSON.stringify(val, BufferJSON.replacer));
                                } else {
                                    delete currentData[type][id];
                                }
                            }
                        }

                        await SessionStore.findOneAndUpdate(
                            { businessId },
                            { $set: { data: currentData } },
                            { upsert: true }
                        );
                        console.log(`[AUTH] Keys updated in DB for ${businessId}`);
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

    // 🕒 30s GLOBAL TIMEOUT (Persists across retries)
    if (!connectionTimers[businessId]) {
        console.log(`[WhatsApp] Starting 30s connection timer for ${businessId}`);
        connectionTimers[businessId] = setTimeout(async () => {
            console.error(`[WhatsApp] Connection timed out (30s) for ${businessId}. Force-clearing session to generate new QR.`);
            delete connectionTimers[businessId];

            // 1. Delete corrupted session from DB
            await SessionStore.deleteOne({ businessId });

            // 2. Kill current socket
            if (clients[businessId]) {
                try { clients[businessId].sock?.end(); } catch (e) { }
                delete clients[businessId];
            }
            initializing.delete(businessId);

            // 3. Restart fresh (New QR)
            initializeClient(businessId);
        }, 30000);
    }

    // Corrected Guard: Only block if already connected or genuinely initializing
    if (clients[businessId]) {
        // If it's old/dead, kill it before starting a new one
        console.log(`[WhatsApp] Cleaning up old socket for ${businessId} before re-init`);
        try { clients[businessId].sock?.end(); } catch (e) { }
        delete clients[businessId];
    }

    try {
        const { state, saveCreds } = await useMongoDBAuthState(businessId);

        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: "silent" }),
        });

        const session = {
            sock,
            qr: null,
            status: "initializing",
            reconnectAttempts: 0
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
                session.status = "ready";
                session.qr = null;
                session.reconnectAttempts = 0;
                initializing.delete(businessId); // Clear initializing set on successful connection

                // ✅ Clear Timeout on Success
                if (connectionTimers[businessId]) {
                    clearTimeout(connectionTimers[businessId]);
                    delete connectionTimers[businessId];
                }

                await Business.findByIdAndUpdate(businessId, { sessionStatus: "connected" });

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
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.warn(`[WhatsApp] Connection closed for ${businessId}. Status: ${statusCode || 'unknown'}. Reconnect: ${shouldReconnect}`);

                session.status = "disconnected";
                session.qr = null;
                await Business.findByIdAndUpdate(businessId, { sessionStatus: "disconnected" });

                if (shouldReconnect) {
                    // 🛑 MAX RETRY CHECK
                    if (session.reconnectAttempts >= 5) {
                        console.error(`[WhatsApp] Max retries (5) reached for ${businessId}. Clearing corrupted session from DB to force new QR.`);
                        await SessionStore.deleteOne({ businessId });
                        session.reconnectAttempts = 0;
                        // The next initializeClient will now find no session and start fresh
                    }

                    const delay = Math.min(Math.pow(2, session.reconnectAttempts) * 1000, 30000);
                    session.reconnectAttempts++;
                    console.log(`[WhatsApp] Retrying ${businessId} in ${delay / 1000}s...`);

                    // Cleanup memory but NOT folder
                    delete clients[businessId];
                    initializing.delete(businessId);

                    setTimeout(() => initializeClient(businessId), delay);
                } else {
                    console.error(`[WhatsApp] Permanent logout for ${businessId}. Data preserved per Zero-Deletion policy.`);
                    // ZERO DELETION: Do not delete data. Just stop retrying.
                    delete clients[businessId];
                    initializing.delete(businessId);

                    await Activity.create({
                        businessId,
                        event: 'auth_failure',
                        details: 'Session logged out from phone. Please reconnect manually if needed.'
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

        // Clear timeout if manual disconnect
        if (connectionTimers[businessId]) {
            clearTimeout(connectionTimers[businessId]);
            delete connectionTimers[businessId];
        }

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
