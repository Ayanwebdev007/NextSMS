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

console.log("[WORKER] Starting Baileys message worker...");

const connection = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
    };

// 🔁 restore saved WhatsApp sessions on worker start
await restoreSessions();

const worker = new Worker(
    "messages",
    async (job) => {
        const { businessId, campaignId, recipient, text, mediaUrl, filePath, variables, minDelay, maxDelay } =
            job.data;

        console.log(`[WORKER] Processing message for ${recipient}`);

        const clientData = clients[businessId];

        if (!clientData || clientData.status !== "ready") {
            throw new Error("WhatsApp session not ready");
        }

        const sock = clientData.sock;

        // 🛑 Pause Check
        if (campaignId) {
            const campaign = await Campaign.findById(campaignId);
            if (campaign && campaign.status === 'paused') {
                console.log(`[WORKER] Campaign ${campaignId} is paused. Rescheduling job ${job.id}...`);
                await job.moveToDelayed(Date.now() + 30000);
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

        // ✅ Baileys JID format
        const jid = recipient.includes("@s.whatsapp.net")
            ? recipient
            : `${recipient.replace(/\D/g, "")}@s.whatsapp.net`;

        try {
            let messagePayload = { text: processedText };

            // 📎 Media from local file
            if (filePath && fs.existsSync(filePath)) {
                messagePayload = {
                    image: fs.readFileSync(filePath),
                    caption: processedText,
                };
            }

            // 🌐 Media from URL
            if (mediaUrl) {
                messagePayload = {
                    image: { url: mediaUrl },
                    caption: processedText,
                };
            }

            await sock.sendMessage(jid, messagePayload);

            // 💳 Update credits
            await Business.findByIdAndUpdate(businessId, {
                $inc: { credits: -1 },
            });

            if (campaignId) {
                await Campaign.findByIdAndUpdate(campaignId, {
                    $inc: { sentCount: 1 },
                });
            }

            await Message.create({
                businessId,
                campaignId,
                recipient,
                content: processedText,
                status: "sent",
                sentAt: new Date(),
            });
        } catch (error) {
            console.error(`[WORKER] Failed to send message:`, error.message);

            if (campaignId) {
                await Campaign.findByIdAndUpdate(campaignId, {
                    $inc: { failedCount: 1 },
                });
            }

            await Message.create({
                businessId,
                campaignId,
                recipient,
                content: processedText,
                status: "failed",
                errorMessage: error.message,
            });

            throw error;
        }

        // ⏱️ Dynamic Anti-ban delay
        const min = minDelay || 4000;
        const max = maxDelay || 10000;
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;

        console.log(`[WORKER] Waiting for ${delay}ms before next message...`);
        await new Promise((r) => setTimeout(r, delay));
    },
    { connection }
);

worker.on("completed", (job) => {
    console.log(`[WORKER] Job ${job.id} completed → ${job.data.recipient}`);
});

worker.on("failed", (job, err) => {
    console.log(`[WORKER] Job ${job.id} failed → ${err.message}`);
});
