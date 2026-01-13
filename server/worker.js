import dotenv from "dotenv";
dotenv.config();

import bullmq from "bullmq";
const { Worker } = bullmq;

import { clients, restoreSessions } from "./controllers/whatsappController.js";
import { Business } from "./models/business.model.js";
import { Message } from "./models/message.model.js";
import { Campaign } from "./models/campaign.model.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[WORKER] Worker module loaded. Awaiting start command...");

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
        "messages",
        async (job) => {
            const { messageId, businessId, campaignId, recipient, text, mediaUrl, filePath, variables, minDelay, maxDelay } =
                job.data;

            console.log(`[WORKER] [Job:${job.id}] Processing for ${recipient} (Business: ${businessId})`);

            // 📊 Log available sessions for debugging
            const activeSessions = Object.keys(clients);
            console.log(`[WORKER] [Job:${job.id}] Active sessions in memory: [${activeSessions.join(", ")}]`);

            try {
                // 🛑 Pause Check
                if (campaignId) {
                    const campaign = await Campaign.findById(campaignId);
                    if (campaign && campaign.status === 'paused') {
                        console.log(`[WORKER] [Job:${job.id}] Campaign is paused. Rescheduling...`);
                        await job.moveToDelayed(Date.now() + 30000);
                        return;
                    }
                }

                // 🔍 Session Check & Auto-Recovery
                let clientData = clients[businessId];

                if (!clientData || clientData.status !== "ready") {
                    console.log(`[WORKER] [Job:${job.id}] Session status: ${clientData?.status || 'missing'}. checking DB...`);
                    const business = await Business.findById(businessId);

                    if (business && business.sessionStatus === "connected") {
                        console.log(`[WORKER] [Job:${job.id}] DB says connected. Initializing if missing...`);
                        const { initializeClient } = await import("./controllers/whatsappController.js");
                        await initializeClient(businessId);

                        // Wait up to 15 seconds for session to become ready
                        for (let i = 0; i < 15; i++) {
                            await new Promise(r => setTimeout(r, 1000));
                            clientData = clients[businessId];
                            if (clientData?.status === "ready") break;
                            if (i % 5 === 0) console.log(`[WORKER] [Job:${job.id}] Still waiting for WhatsApp... (${i + 1}s)`);
                        }
                    }

                    if (!clientData || clientData.status !== "ready") {
                        throw new Error(`WhatsApp session not ready (Status: ${clientData?.status || 'missing'})`);
                    }
                }

                const sock = clientData.sock;
                console.log(`[WORKER] [Job:${job.id}] Session verified. Preparing payload...`);

                // 🔗 Variable Replacement Logic
                let processedText = text;
                if (variables && typeof variables === 'object') {
                    processedText = text.replace(/{{(\w+)}}/g, (match, key) => {
                        return variables[key] !== undefined ? variables[key] : match;
                    });
                }

                // ✅ Baileys JID format
                const jid = recipient.includes("@s.whatsapp.net")
                    ? recipient
                    : `${recipient.replace(/\D/g, "")}@s.whatsapp.net`;

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

                // Add buttons to payload if any
                if (buttons.length > 0) {
                    messagePayload.buttons = buttons;
                    messagePayload.headerType = mediaUrl || resolvedPath ? 4 : 1;
                }

                console.log(`[WORKER] [Job:${job.id}] Dispatching message to WhatsApp...`);
                await sock.sendMessage(jid, messagePayload);
                console.log(`[WORKER] [Job:${job.id}] Message sent to ${recipient}`);

                // 💳 Update credits & Campaign counts
                await Business.findByIdAndUpdate(businessId, { $inc: { credits: -1 } });
                if (campaignId) {
                    await Campaign.findByIdAndUpdate(campaignId, { $inc: { sentCount: 1 } });
                }

                // Update or Create history record
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
                console.error(`[WORKER] [Job:${job.id}] ERROR:`, error.message);

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
        { connection }
    );

    worker.on("completed", (job) => {
        console.log(`[WORKER] Job ${job.id} completed.`);
    });

    worker.on("failed", (job, err) => {
        console.log(`[WORKER] Job ${job.id} failed: ${err.message}`);
    });
};
