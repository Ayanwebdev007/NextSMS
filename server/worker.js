import "./env.js";
import os from "os";

import bullmq from "bullmq";
const { Worker } = bullmq;

import { clients, restoreSessions, initializeClient } from "./controllers/whatsappController.js";
import { Business } from "./models/business.model.js";
import { Message } from "./models/message.model.js";
import { Campaign } from "./models/campaign.model.js";
import { initializeWorkerManager, wakeWorker } from "./utils/workerManager.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INSTANCE_ID = `${os.hostname()}-${process.pid}`;

console.log(`[WORKER] Worker module loaded. Instance: ${INSTANCE_ID}`);

let worker = null;

const connection = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
    };

export const startWorker = async () => {
    if (worker) {
        console.log("[WORKER] Worker is already running.");
        return;
    }

    console.log("[WORKER] Initializing Baileys message worker...");

    worker = new Worker(
        "nextsms_prod_v1",
        async (job) => {

            const { messageId, businessId, campaignId, recipient, text, mediaUrl, filePath, variables, minDelay, maxDelay } =
                job.data;

            const startTime = Date.now();
            console.log(`\n[WORKER] [Job:${job.id}] 📨 Start processing for ${recipient} (Business: ${businessId})`);

            // 🔥 Mark worker as active (resets idle timer)
            wakeWorker();

            // 📊 Log available sessions for debugging
            const activeSessions = Object.keys(clients);
            console.log(`[WORKER] [Job:${job.id}] Active sessions in memory: [${activeSessions.join(", ")}]`);

            try {
                //  Fetch Business Early (Used for session checks and footers)
                const business = await Business.findById(businessId);
                if (!business) throw new Error("Business not found");

                if (campaignId) {
                    const campaign = await Campaign.findById(campaignId);
                    if (campaign && campaign.status === 'paused') {
                        console.log(`[WORKER] [Job:${job.id}] Campaign paused. Waiting...`);
                        throw new Error("RETRY_LATER: Campaign paused");
                    }
                }

                // 🔒 Lock Check: Only the owner of the session should process its messages
                const { SessionStore } = await import("./models/sessionStore.model.js");
                const sessionEntry = await SessionStore.findOne({ businessId });
                if (sessionEntry && sessionEntry.masterId && sessionEntry.masterId !== INSTANCE_ID) {
                    // Check if the OTHER instance is stale before rejecting
                    const now = new Date();
                    const timeout = 90000; // SYNC WITH CONTROLLER: 90s
                    if (sessionEntry.lastHeartbeat && (now - sessionEntry.lastHeartbeat) > timeout) {
                        console.warn(`[WORKER] [Job:${job.id}] Master ${sessionEntry.masterId} is STALE (>90s). Ignored. Proceeding to takeover...`);
                        // Proceed (don't throw)
                    } else {
                        console.log(`[WORKER] [Job:${job.id}] Delaying - Managed by instance (${sessionEntry.masterId})`);
                        throw new Error(`RETRY_LATER: Managed by instance ${sessionEntry.masterId}`);
                    }
                }

                // 🕵️ EXTRA SAFETY: Double check heartbeats (Self-Staleness)
                const now = new Date();
                const timeout = 90000; // SYNC WITH CONTROLLER: 90s
                if (sessionEntry && sessionEntry.lastHeartbeat && (now - sessionEntry.lastHeartbeat) > timeout) {
                    console.warn(`[WORKER] [Job:${job.id}] Master ${sessionEntry.masterId} is STALE. Proceeding to self-heal...`);
                    // Do NOT throw. Allow fall-through to trigger initializeClient.
                }

                // 🔍 Session Check (Consumer Only - No Competing Init)
                let clientData = clients[businessId];

                if (!clientData || clientData.status !== "ready") {
                    console.log(`[WORKER] [Job:${job.id}] Session not ready (Status: ${clientData?.status || 'missing'}). Waiting...`);

                    // OPTIMIZED WAIT: Snappy feedback for ready state
                    for (let i = 0; i < 5; i++) {
                        await new Promise(r => setTimeout(r, 400)); // 400ms * 5 = 2s
                        clientData = clients[businessId];
                        if (clientData?.status === "ready") break;
                    }

                    if (!clientData || clientData.status !== "ready") {
                        // 1. If session exists in memory (even if disconnected), it means we are retrying.
                        // DO NOT FAIL PERMANENTLY. Just wait.
                        if (clientData) {
                            console.log(`[WORKER] [Job:${job.id}] Session exists but isn't ready (${clientData.status}). Retrying later.`);
                            throw new Error("RETRY_LATER: Session reconnecting");
                        }

                        // 2. If session completely missing, but DB says connected (e.g. restart happened)
                        if (business && business.sessionStatus === "connected") {
                            console.log(`[WORKER] [Job:${job.id}] Session missing in memory. 🛠️  Attempting SELF-HEALING restore for ${businessId}...`);

                            // Active Self-Healing
                            try {
                                const healStart = Date.now();
                                await initializeClient(businessId);
                                console.log(`[WORKER] [Job:${job.id}] InitializeClient took ${Date.now() - healStart}ms`);

                                // Wait 5s for it to connect
                                await new Promise(r => setTimeout(r, 5000));
                                clientData = clients[businessId];

                                if (clientData?.status === "ready") {
                                    console.log(`[WORKER] [Job:${job.id}] ✅ Self-healing successful! Resuming...`);
                                    return; // RE-RUN: The job will be picked up again immediately and process normally
                                } else {
                                    throw new Error("RETRY_LATER: Healing in progress");
                                }
                            } catch (e) {
                                console.error(`[WORKER] Healing failed: ${e.message}`);
                                throw new Error("RETRY_LATER: Healing failed");
                            }
                        }

                        // 3. Only fail if DB explicitly says disconnected AND we have no session in memory
                        // Check one last time before giving up
                        if (clients[businessId]?.status === "ready") return;

                        throw new Error(`WhatsApp not connected (Status: ${business?.sessionStatus || 'disconnected'})`);
                    }
                }

                const sock = clientData.sock;

                // 🕵️ EXTRA STABILITY CHECK: Ensure sock.user exists (Proof of authentication)
                if (!sock.user) {
                    console.warn(`[WORKER] [Job:${job.id}] Socket status is ready but sock.user is missing. Connection unstable. Waiting...`);
                    await job.moveToDelayed(Date.now() + 5000);
                    return;
                }

                // DEEP DEBUG: Check internal auth state
                console.log(`[WORKER] [Job:${job.id}] Auth Debug: User=${sock.user?.id}, Me=${sock.authState?.creds?.me?.id}, Signal=${!!sock.authState?.creds?.signalIdentities}`);

                if (!sock.authState?.creds?.me) {
                    console.error(`[WORKER] [Job:${job.id}] CRITICAL: Socket has user but internal authState.creds.me is MISSING. Force restoring...`);
                    // Force restore
                    initializing.delete(businessId);
                    delete clients[businessId];
                    await initializeClient(businessId);
                    throw new Error("RETRY_LATER: Internal state corrupted, restoring...");
                }

                // 🔌 SOCKET HEALTH CHECK (NEW)
                // 🔌 SOCKET HEALTH CHECK REMOVED (Simplification)
                // We rely on sock.sendMessage throwing an error if broken.

                console.log(`[WORKER] [Job:${job.id}] Session verified (User: ${sock.user.id}). WS Open: ${sock.ws?.isOpen}. Preparing payload...`);

                // 🛑 LAST-SECOND CANCELLATION CHECK
                // If the user clicked "Clear Stuck Messages", the DB status will be 'failed'.
                if (messageId) {
                    const currentMsg = await Message.findById(messageId).select('status');
                    if (!currentMsg || currentMsg.status === 'failed') {
                        console.log(`[WORKER] [Job:${job.id}] 🛑 Message was CANCELLED by user. Skipping send.`);
                        return; // Terminate job successfully without sending
                    }
                }

                if (campaignId) {
                    const currentCamp = await Campaign.findById(campaignId).select('status');
                    if (!currentCamp || currentCamp.status === 'failed' || currentCamp.status === 'paused') {
                        console.log(`[WORKER] [Job:${job.id}] 🛑 Campaign was CANCELLED or PAUSED. Skipping send.`);
                        if (currentCamp?.status === 'paused') {
                            throw new Error("RETRY_LATER: Campaign paused");
                        }
                        return;
                    }
                }

                // 🔗 Variable Replacement Logic
                let processedText = text;
                if (variables && typeof variables === 'object') {
                    processedText = text.replace(/{{(\w+)}}/g, (match, key) => {
                        return variables[key] !== undefined ? variables[key] : match;
                    });
                }

                // ✅ Robust JID formatting (Auto-91 for 10-digit numbers)
                let cleanRecipient = recipient.toString().replace(/\D/g, "");
                if (cleanRecipient.length === 10) {
                    cleanRecipient = "91" + cleanRecipient;
                }
                const jid = cleanRecipient.includes("@") ? cleanRecipient : `${cleanRecipient}@s.whatsapp.net`;

                // Fetch campaign for buttons if campaignId exists
                let buttons = [];
                if (campaignId) {
                    const campaign = await Campaign.findById(campaignId);
                    if (campaign && campaign.buttons && campaign.buttons.length > 0) {
                        buttons = campaign.buttons.map((btn, index) => ({
                            buttonId: `${campaignId}_${index}`,
                            buttonText: { displayText: btn.text },
                            type: 1
                        }));
                    }
                }

                let messagePayload = { text: processedText };

                // 📎 Media 
                let resolvedPath = filePath ? path.resolve(__dirname, filePath) : null;
                if (resolvedPath && !fs.existsSync(resolvedPath)) {
                    resolvedPath = filePath;
                }

                if (resolvedPath && fs.existsSync(resolvedPath)) {
                    console.log(`[WORKER] [Job:${job.id}] Sending media file: ${resolvedPath}`);
                    const ext = path.extname(resolvedPath).toLowerCase();

                    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                        messagePayload = {
                            image: fs.readFileSync(resolvedPath),
                            caption: processedText,
                        };
                    } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
                        messagePayload = {
                            video: fs.readFileSync(resolvedPath),
                            caption: processedText,
                        };
                    } else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
                        messagePayload = {
                            audio: fs.readFileSync(resolvedPath),
                            mimetype: 'audio/mp4', // Baileys often prefers this for audio
                            ptt: false // Start as normal audio
                        };
                    } else {
                        // Default to document for PDF, DOC, XLS, etc.
                        let mime = 'application/octet-stream';
                        if (ext === '.pdf') mime = 'application/pdf';
                        if (ext === '.doc') mime = 'application/msword';
                        if (ext === '.docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                        if (ext === '.xls') mime = 'application/vnd.ms-excel';
                        if (ext === '.xlsx') mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                        if (ext === '.txt') mime = 'text/plain';

                        messagePayload = {
                            document: fs.readFileSync(resolvedPath),
                            mimetype: mime,
                            fileName: path.basename(resolvedPath),
                            caption: processedText
                        };
                    }
                } else if (mediaUrl) {
                    const ext = path.extname(mediaUrl).split('?')[0].toLowerCase(); // Basic URL ext check

                    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                        messagePayload = {
                            image: { url: mediaUrl },
                            caption: processedText,
                        };
                    } else if (['.mp4', '.avi', '.mov'].includes(ext)) {
                        messagePayload = {
                            video: { url: mediaUrl },
                            caption: processedText,
                        };
                    } else {
                        // For URLs, if we can't be sure, defaulting to document is safer if it's not an obvious image
                        // But if ext is missing, we might have issues.
                        let mime = 'application/octet-stream';
                        if (ext === '.pdf') mime = 'application/pdf';
                        if (ext === '.docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                        if (ext === '.xlsx') mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

                        messagePayload = {
                            document: { url: mediaUrl },
                            mimetype: mime,
                            fileName: path.basename(mediaUrl).split('?')[0] || 'file',
                            caption: processedText,
                        };
                    }
                }

                // Add buttons to payload if any (Standard buttonsMessage format)
                // NOTE: buttonsMessage only works with TEXT, not with images
                if (buttons.length > 0) {
                    // If there's media, we can't use buttons - strip them
                    if (mediaUrl || (resolvedPath && fs.existsSync(resolvedPath))) {
                        console.warn(`[WORKER] [Job:${job.id}] Buttons not supported with media. Sending media without buttons.`);
                        // Keep the media payload as-is, no buttons
                    } else {
                        // Text-only message with buttons
                        messagePayload.buttons = buttons;
                        messagePayload.footer = business.name || "NextSMS";
                    }
                }

                console.log(`[WORKER] [Job:${job.id}] Dispatching message to ${jid} (Auto-formatted)...`);

                try {
                    const sendStart = Date.now();
                    const result = await sock.sendMessage(jid, messagePayload);
                    console.log(`[WORKER] [Job:${job.id}] 🟢 WhatsApp ACK: Message accepted by server for ${jid} (Time: ${Date.now() - sendStart}ms)`);
                    if (result) {
                        // Success
                    }
                } catch (sendError) {
                    // DETAILED ERROR LOGGING
                    console.error(`[WORKER] [Job:${job.id}] Send Error: ${sendError.message}`);
                    console.error(`[WORKER] [Job:${job.id}] Error Stack: ${sendError.stack}`);
                    console.error(`[WORKER] [Job:${job.id}] Socket State - User: ${!!sock.user}, AuthState: ${!!sock.authState}, Creds: ${!!sock.authState?.creds}, Me: ${!!sock.authState?.creds?.me}`);

                    console.log(`[WORKER] [Job:${job.id}] Attempting recovery retry...`);

                    // Pause for 2s before retry
                    await new Promise(r => setTimeout(r, 2000));

                    try {
                        await sock.sendMessage(jid, messagePayload);
                    } catch (retryError) {
                        if (buttons.length > 0) {
                            console.warn(`[WORKER] [Job:${job.id}] Button delivery failed (${retryError.message}). Falling back to standard message...`);

                            // Strip buttons and try one more time
                            const fallbackPayload = { ...messagePayload };
                            delete fallbackPayload.buttons;
                            delete fallbackPayload.footer;
                            delete fallbackPayload.headerType;

                            await sock.sendMessage(jid, fallbackPayload);

                            // Mark history as sent with fallback
                            if (messageId) {
                                await Message.findByIdAndUpdate(messageId, {
                                    status: "sent",
                                    errorMessage: "Buttons rejected by server; delivered as text fallback.",
                                    content: processedText,
                                    sentAt: new Date(),
                                });
                            } else {
                                await Message.create({
                                    businessId,
                                    campaignId: campaignId || null,
                                    recipient,
                                    content: processedText,
                                    status: "sent",
                                    errorMessage: "Buttons rejected by server; delivered as text fallback.",
                                    sentAt: new Date(),
                                });
                            }

                            // Proceed to end of loop (don't create duplicate record)
                            return;
                        } else {
                            throw retryError;
                        }
                    }
                }

                console.log(`[WORKER] [Job:${job.id}] ✅ Message sent to ${recipient} in ${Date.now() - startTime}ms`);

                // Track activity for IDLE CLEANUP
                if (clients[businessId]) {
                    clients[businessId].lastActivity = Date.now();
                }

                // 💳 Campaign counts (Credits already deducted at reservation time)
                if (campaignId) {
                    const campaign = await Campaign.findByIdAndUpdate(
                        campaignId,
                        { $inc: { sentCount: 1 } },
                        { new: true }
                    );

                    if (campaign && (campaign.sentCount + campaign.failedCount >= campaign.totalMessages)) {
                        await Campaign.updateOne({ _id: campaignId }, { status: 'completed' });
                        console.log(`[WORKER] Campaign ${campaignId} marked as COMPLETED.`);
                    }
                }

                // Update or Create history record (Normal Success)
                if (messageId) {
                    await Message.findByIdAndUpdate(messageId, {
                        status: "sent",
                        content: processedText,
                        sentAt: new Date(),
                    });
                } else {
                    await Message.create({
                        businessId,
                        campaignId: campaignId || null,
                        recipient,
                        content: processedText,
                        status: "sent",
                        sentAt: new Date(),
                    });
                }

            } catch (error) {
                const isTransient = error.message.includes("RETRY_LATER");
                if (isTransient) {
                    console.warn(`[WORKER] [Job:${job.id}] Transient delay: ${error.message}`);
                    // Custom delay for specific transient errors
                    const delay = error.message.includes("Campaign") ? 60000 : 10000;
                    await job.moveToDelayed(Date.now() + delay);
                    return; // Fail without moving to "failed" state or updating DB
                }

                console.error(`[WORKER] [Job:${job.id}] PERMANENT ERROR:`, error.message);

                if (campaignId) {
                    const campaign = await Campaign.findByIdAndUpdate(
                        campaignId,
                        { $inc: { failedCount: 1 } },
                        { new: true }
                    );

                    if (campaign && (campaign.sentCount + campaign.failedCount >= campaign.totalMessages)) {
                        await Campaign.updateOne({ _id: campaignId }, { status: 'completed' });
                        console.log(`[WORKER] Campaign ${campaignId} marked as COMPLETED (with errors).`);
                    }
                }

                // 💳 REFUND: Return credit on permanent failure
                await Business.findByIdAndUpdate(businessId, { $inc: { credits: 1 } });

                if (messageId) {
                    await Message.findByIdAndUpdate(messageId, {
                        status: "failed",
                        errorMessage: error.message,
                    });
                } else {
                    await Message.create({
                        businessId,
                        campaignId: campaignId || null,
                        recipient,
                        content: text || "N/A",
                        status: "failed",
                        errorMessage: error.message,
                    });
                }
                throw error;
            }

            // ⏱️ Anti-ban delay
            const min = minDelay || 4000;
            const max = maxDelay || 10000;
            const delay = Math.floor(Math.random() * (max - min + 1)) + min;

            console.log(`[WORKER] [Job:${job.id}] Delaying next action for ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
        },
        {
            connection,
            concurrency: 50,  // UNHINGED: Allow many parallel jobs so anti-ban sleeps don't block
            lockDuration: 600000, // INCREASED: 10 minutes (Ensures worker doesn't lose lock during slow sends/history sync)
            stalledInterval: 300000, // INCREASED: 5 minutes (Matches lock/healing duration)
            maxStalledCount: 1,
            drainDelay: 1000, // REDUCED: 1s (was 30s) - Checks for jobs more frequently when empty
            limiter: {
                max: 100,      // INCREASED: 100 messages per client per minute
                duration: 60000,  // per minute
                groupKey: 'businessId' // SCALABILITY: Limits apply per business, not globally
            },
            removeOnComplete: { count: 100 }, // Auto-cleanup to save Redis memory
            removeOnFail: { count: 100 }
        }
    );

    // 🌙 Initialize sleep/wake manager (eliminates idle Redis requests)
    initializeWorkerManager(worker);

    // 🕵️ WORKER HEARTBEAT (Proves worker is not hung)
    setInterval(() => {
        console.log(`[WORKER] [${INSTANCE_ID}] Active & Polling nextsms_prod_v1...`);
    }, 60000); // 1m check
};
