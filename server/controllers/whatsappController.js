import { default as makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from "@whiskeysockets/baileys";
import pino from "pino";

import asyncHandler from "express-async-handler";
import { Business } from "../models/business.model.js";
import { Activity } from "../models/activity.model.js";
import qrcode from "qrcode";
import fs from "fs";
import path from "path";
import os from "os";

export const clients = {}; // businessId -> { sock, qr, status }
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
    // SYNC GUARD: Prevent racing initializations
    if (clients[businessId]?.status === "ready") return;
    if (initializing.has(businessId)) {
        console.log(`[WhatsApp] Already initializing ${businessId}, skipping duplicate call.`);
        return;
    }

    initializing.add(businessId);
    console.log(`[WhatsApp] Initializing socket for ${businessId}...`);

    // Corrected Guard: Only block if already connected or genuinely initializing
    if (clients[businessId]) {
        // If it's old/dead, kill it before starting a new one
        console.log(`[WhatsApp] Cleaning up old socket for ${businessId} before re-init`);
        try { clients[businessId].sock?.end(); } catch (e) { }
        delete clients[businessId];
    }

    try {
        const sessionPath = getSessionPath(businessId);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

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
                    const delay = Math.min(Math.pow(2, session.reconnectAttempts) * 1000, 30000);
                    session.reconnectAttempts++;
                    console.log(`[WhatsApp] Retrying ${businessId} in ${delay / 1000}s...`);

                    // Cleanup memory but NOT folder
                    delete clients[businessId];
                    initializing.delete(businessId);

                    setTimeout(() => initializeClient(businessId), delay);
                } else {
                    console.error(`[WhatsApp] Permanent logout for ${businessId}. Folder preserved for recovery.`);
                    delete clients[businessId];
                    initializing.delete(businessId);

                    await Activity.create({
                        businessId,
                        event: 'auth_failure',
                        details: 'Session logged out from phone. Please re-scan.'
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

    // Force a Hard Reset for NEW connections
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

    // Wipe folder to ensure a 100% clean scan
    deleteSessionFolder(businessId);

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
        const sessionPath = getSessionPath(businessId);
        if (fs.existsSync(sessionPath)) {
            // Most likely it's about to be restored by the loop or just died.
            return res.json({ status: "initializing" });
        } else {
            // No folder? It's gone.
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
