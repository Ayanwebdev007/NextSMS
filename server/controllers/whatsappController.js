import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
} from "@whiskeysockets/baileys";

import asyncHandler from "express-async-handler";
import { Business } from "../models/business.model.js";
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

    if (fs.existsSync(sessionPath) && !fs.existsSync(credsPath)) {
        console.warn(`[CLEANUP] Removing broken session for ${businessId}`);
        fs.rmSync(sessionPath, { recursive: true, force: true });
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
const initializeClient = async (businessId) => {
    if (clients[businessId] || initializing.has(businessId)) return;

    initializing.add(businessId);
    cleanBrokenSession(businessId);

    // console.log(`[INIT] Initializing Baileys for ${businessId}`);

    const sessionPath = getSessionPath(businessId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        browser: ["NextSMS", "Chrome", "1.0"],
    });

    clients[businessId] = {
        sock,
        status: "initializing",
        qr: null,
    };

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        /* -------- QR -------- */
        if (qr) {
            // console.log(`[QR] Generated for ${businessId}`);
            clients[businessId].qr = await qrcode.toDataURL(qr);

            await Business.findByIdAndUpdate(businessId, {
                sessionStatus: "qr_pending",
            });
        }

        /* -------- READY -------- */
        if (connection === "open") {
            // console.log(`[READY] Client ready for ${businessId}`);

            initializing.delete(businessId);
            clients[businessId].status = "ready";
            clients[businessId].qr = null;

            await Business.findByIdAndUpdate(businessId, {
                sessionStatus: "connected",
            });
        }

        /* -------- DISCONNECTED -------- */
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const code = statusCode || lastDisconnect?.error?.message;

            console.warn(`[DISCONNECTED] ${businessId}`, code);

            delete clients[businessId];
            initializing.delete(businessId);

            await Business.findByIdAndUpdate(businessId, {
                sessionStatus: "disconnected",
            });

            /* AUTO RECONNECT (NOT LOGOUT) */
            if (statusCode !== DisconnectReason.loggedOut) {
                // console.log(`[RECONNECT] Reconnecting ${businessId}...`);
                setTimeout(() => initializeClient(businessId), 3000);
            } else {
                // console.log(`[LOGOUT] Clearing session for ${businessId}`);
                // Clear auth so next connect will force a fresh QR
                deleteSessionFolder(businessId);
                // Do not auto-reconnect; wait for explicit /session/connect
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
        return res.json({ status: "qr_pending" });
    }

    const business = await Business.findById(businessId);
    return res.json({
        status: business?.sessionStatus || "disconnected",
    });
});

/* =======================
   API: DISCONNECT SESSION
======================= */
export const disconnectSession = asyncHandler(async (req, res) => {
    const businessId = req.business._id.toString();
    const client = clients[businessId];

    if (client?.sock) {
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
    initializing.delete(businessId);

    // Ensure auth is fully cleared so next connect requires QR
    deleteSessionFolder(businessId);

    await Business.findByIdAndUpdate(businessId, {
        sessionStatus: "disconnected",
    });

    res.json({ message: "Disconnected successfully" });
});
