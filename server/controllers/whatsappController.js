import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import pino from "pino";

import asyncHandler from "express-async-handler";
import { Business } from "../models/business.model.js";
import { Activity } from "../models/activity.model.js";
import qrcode from "qrcode";
import fs from "fs";
import path from "path";
import os from "os";

/* =======================
   GLOBAL STATE
======================= */
export const clients = {};
const initializing = new Set();

/* =======================
   AUTH PATH
======================= */
const AUTH_PATH =
    process.env.NODE_ENV === "production" ? path.join(os.tmpdir(), "baileys_auth") : path.resolve("./.baileys_auth");

if (!fs.existsSync(AUTH_PATH)) {
    fs.mkdirSync(AUTH_PATH, { recursive: true });
}

/* =======================
   AUTH HELPERS
======================= */
const getSessionPath = (businessId) => path.join(AUTH_PATH, businessId);

const deleteSessionFolder = (businessId) => {
    const sessionPath = getSessionPath(businessId);
    if (fs.existsSync(sessionPath)) {
        // console.log(`[AUTH] Deleting auth folder for ${businessId}`);
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }
};

/* =======================
   CLEAN BROKEN SESSION
======================= */
const cleanBrokenSession = (businessId) => {
    const sessionPath = getSessionPath(businessId);
    const credsPath = path.join(sessionPath, "creds.json");

    if (fs.existsSync(sessionPath)) {
        if (!fs.existsSync(credsPath)) {
            console.warn(`[CLEANUP] Missing creds.json for ${businessId}. Wiping corrupted folder.`);
            fs.rmSync(sessionPath, { recursive: true, force: true });
        } else {
            // Check if JSON is valid to prevent Baileys from crashing on load
            try {
                const content = fs.readFileSync(credsPath, 'utf-8');
                JSON.parse(content);
            } catch (err) {
                console.error(`[CLEANUP] Corrupted creds.json for ${businessId}. Resetting...`);
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
        }
    }
};

/* =======================
   RESTORE SESSIONS
======================= */
export const restoreSessions = async () => {
    // console.log("[SESSION RESTORE] Checking saved Baileys sessions");

    if (!fs.existsSync(AUTH_PATH)) return;

    const sessions = fs.readdirSync(AUTH_PATH);

    for (const businessId of sessions) {
        const sessionPath = path.join(AUTH_PATH, businessId);
        if (!fs.statSync(sessionPath).isDirectory()) continue;

        cleanBrokenSession(businessId);
        initializeClient(businessId);
    }
};

/* =======================
   INITIALIZE CLIENT
======================= */
export const initializeClient = async (businessId) => {
    if (clients[businessId] || initializing.has(businessId)) return;

    initializing.add(businessId);
    cleanBrokenSession(businessId);

    // console.log(`[INIT] Initializing Baileys for ${businessId}`);

    const sessionPath = getSessionPath(businessId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const logger = pino({ level: "silent" });

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        browser: ["NextSMS", "Chrome", "1.0"],
        logger,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 15000,
        generateHighQualityLinkPreview: false,
    });

    clients[businessId] = {
        sock,
        status: "initializing",
        qr: null,
        reconnectAttempts: clients[businessId]?.reconnectAttempts || 0,
    };

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        /* -------- QR -------- */
        if (qr) {
            clients[businessId].qr = await qrcode.toDataURL(qr);
            await Business.findByIdAndUpdate(businessId, { sessionStatus: "qr_pending" });
            await Activity.create({
                businessId,
                event: 'qr_generated',
                details: 'WhatsApp QR code generated'
            });
        }

        /* -------- READY -------- */
        if (connection === "open") {
            console.log(`[STABLE] Connection opened for ${businessId}`);
            initializing.delete(businessId);
            clients[businessId].status = "ready";
            clients[businessId].qr = null;
            clients[businessId].reconnectAttempts = 0; // Reset on success

            await Business.findByIdAndUpdate(businessId, { sessionStatus: "connected" });

            if (clients[businessId].presenceInterval) clearInterval(clients[businessId].presenceInterval);
            clients[businessId].presenceInterval = setInterval(async () => {
                try {
                    if (clients[businessId]?.status === "ready") {
                        await sock.sendPresenceUpdate("available");
                    }
                } catch (err) {
                    console.error(`[KEEPALIVE] Pulse failed for ${businessId}:`, err.message);
                }
            }, 1000 * 60 * 5); // Intense pulse every 5 mins

            await Activity.create({
                businessId,
                event: 'connected',
                details: 'WhatsApp session stable and online'
            });
        }

        /* -------- DISCONNECTED (Zero-Drop Policy) -------- */
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const code = statusCode || lastDisconnect?.error?.message;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.warn(`[RECOVERY] Session interrupted for ${businessId}. Reason: ${code}. Reconnect: ${shouldReconnect}`);

            if (clients[businessId]?.presenceInterval) clearInterval(clients[businessId].presenceInterval);

            // Keep the data structure but mark as disconnected
            if (clients[businessId]) {
                clients[businessId].status = "disconnected";
            }

            initializing.delete(businessId);
            await Business.findByIdAndUpdate(businessId, { sessionStatus: "disconnected" });

            if (shouldReconnect) {
                // Exponential Backoff: (2^attempts * 1000)ms + jitter
                const attempts = clients[businessId]?.reconnectAttempts || 0;
                const delay = Math.min(Math.pow(2, attempts) * 1000, 30000) + (Math.random() * 1000);

                if (clients[businessId]) clients[businessId].reconnectAttempts = attempts + 1;

                console.log(`[BACKOFF] Reconnecting ${businessId} in ${Math.round(delay / 1000)}s... (Attempt ${attempts + 1})`);

                setTimeout(() => {
                    // Only re-init if not already trying
                    if (!clients[businessId] || clients[businessId].status !== "ready") {
                        initializeClient(businessId);
                    }
                }, delay);
            } else {
                console.error(`[FATAL] Session logged out for ${businessId}. Manual scan required.`);
                delete clients[businessId];
                deleteSessionFolder(businessId);

                await Activity.create({
                    businessId,
                    event: 'auth_failure',
                    details: 'Session logged out from phone. Re-scanning required.'
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
};

/* =======================
   API: CONNECT SESSION
======================= */
export const connectSession = asyncHandler(async (req, res) => {
    const businessId = req.business._id.toString();

    if (clients[businessId]) {
        return res.status(409).json({ message: "Session already active" });
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

    if (client?.status === "ready") {
        return res.json({ status: "connected" });
    }

    if (client?.qr) {
        return res.json({
            status: "qr_pending",
            qrCodeUrl: client.qr
        });
    }

    // Defensive: If client structure exists but no QR yet, it's still initializing
    if (client || initializing.has(businessId)) {
        return res.json({ status: "initializing" });
    }

    const business = await Business.findById(businessId);

    // If DB says qr_pending but memory is empty, the server probably just restarted.
    // We should return 'initializing' so the UI shows a loader until the QR is regenerated.
    let status = business?.sessionStatus || "disconnected";
    if (status === "qr_pending" && !client) {
        status = "initializing";
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
