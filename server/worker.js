import "./env.js";
import os from "os";

import bullmq from "bullmq";
const { Worker } = bullmq;

import { clients, restoreSessions, initializeClient } from "./controllers/whatsappController.js";
import { Business } from "./models/business.model.js";
import { Message } from "./models/message.model.js";
import { Campaign } from "./models/campaign.model.js";

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
                    console.log(`[WORKER] [Job:${job.id}] Delaying - Managed by instance (${sessionEntry.masterId})`);
                    throw new Error(`RETRY_LATER: Managed by instance ${sessionEntry.masterId}`);
                }

                // 🕵️ EXTRA SAFETY: Double check heartbeats
                const now = new Date();
                const timeout = 30000;
                if (sessionEntry && sessionEntry.lastHeartbeat && (now - sessionEntry.lastHeartbeat) > timeout) {
                    console.log(`[WORKER] [Job:${job.id}] Master ${sessionEntry.masterId} is STALE. Waiting for handover...`);
                    throw new Error("RETRY_LATER: Master stale");
                }

                // 🔍 Session Check (Consumer Only - No Competing Init)
                let clientData = clients[businessId];

                if (!clientData || clientData.status !== "ready") {
                    console.log(`[WORKER] [Job:${job.id}] Session not ready (Status: ${clientData?.status || 'missing'}). Waiting...`);

                    // Wait up to 10 seconds for session to become ready (managed by restoreSessions)
                    for (let i = 0; i < 10; i++) {
                        await new Promise(r => setTimeout(r, 1000));
                        clientData = clients[businessId];
                        if (clientData?.status === "ready") break;
                    }

                    if (!clientData || clientData.status !== "ready") {
                        if (business && business.sessionStatus === "connected") {
                            console.log(`[WORKER] [Job:${job.id}] Session missing in memory but DB says connected. Waiting for server to restore...`);
                            throw new Error("RETRY_LATER: Session restoring");
                        }
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
                console.log(`[WORKER] [Job:${job.id}] Session verified (User: ${sock.user.id}). Preparing payload...`);

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
                    messagePayload = {
                        image: fs.readFileSync(resolvedPath),
                        caption: processedText,
                    };
                } else if (mediaUrl) {
                    messagePayload = {
                        image: { url: mediaUrl },
                        caption: processedText,
                    };
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
                    const result = await sock.sendMessage(jid, messagePayload);
                    if (result) {
                        console.log(`[WORKER] [Job:${job.id}] 🟢 WhatsApp ACK: Message accepted by server for ${jid}`);
                    }
                } catch (sendError) {
                    // RETRY once if it looks like a transient network error
                    console.error(`[WORKER] [Job:${job.id}] Send Error: ${sendError.message}. Attempting recovery retry...`);

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

                // 💳 Update credits & Campaign counts
                await Business.findByIdAndUpdate(businessId, { $inc: { credits: -1 } });
                if (campaignId) {
                    await Campaign.findByIdAndUpdate(campaignId, { $inc: { sentCount: 1 } });
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
                    await Campaign.findByIdAndUpdate(campaignId, { $inc: { failedCount: 1 } });
                }

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
            concurrency: 1
        }
    );

    worker.on("completed", (job) => {
        console.log(`[WORKER] Job ${job.id} completed.`);
    });

    worker.on("failed", (job, err) => {
        console.log(`[WORKER] Job ${job.id} failed: ${err.message}`);
    });
};
