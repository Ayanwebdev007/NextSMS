import asyncHandler from "express-async-handler";
import { Business } from "../models/business.model.js";
import { Message } from "../models/message.model.js";
import { Campaign } from "../models/campaign.model.js";
import { messageQueue } from "../workers/queue.js";
import { wakeWorker } from "../utils/workerManager.js";

export const sendMessage = asyncHandler(async (req, res) => {
    const { recipient, text, mediaUrl, filePath } = req.body;
    const businessId = req.business._id;

    if (!recipient || !text) {
        return res.status(400).json({
            message: "Recipient phone number and text are required.",
        });
    }

    // ATOMIC RESERVATION: Deduct 1 credit immediately to prevent concurrent spending loopholes
    const currentBusiness = await Business.findOneAndUpdate(
        { _id: businessId, credits: { $gt: 0 } },
        { $inc: { credits: -1 } },
        { new: true }
    );

    if (!currentBusiness) {
        return res.status(403).json({
            message: "Insufficient credits or business not found.",
        });
    }

    if (currentBusiness.sessionStatus !== "connected") {
        return res.status(400).json({
            message:
                "WhatsApp session is not active. Please connect your device first.",
        });
    }

    // Create a 'queued' message record immediately for history tracking
    const messageRecord = await Message.create({
        businessId: businessId.toString(),
        recipient,
        content: text,
        status: "queued"
    });

    // Add job to BullMQ
    console.log(`[QUEUE] Adding Job to nextsms_prod_v1 for ${recipient}...`);
    try {
        const jobData = {
            messageId: messageRecord._id.toString(),
            businessId: businessId.toString(),
            recipient,
            text,
            mediaUrl,
            filePath,
        };

        // SCALABILITY FIX: Group jobs by businessId for fair scheduling
        await messageQueue.add(`send_${businessId.toString()}`, jobData, {
            priority: 1,            // ⚡ HIGH PRIORITY: Individual messages cut the line
            attempts: 5,            // Reduced attempts to prevent zombie retries
            backoff: {
                type: 'fixed',
                delay: 15000        // Snippy 15s retry
            },
            removeOnComplete: 100,  // Keep last 100 completed jobs
            removeOnFail: 200       // Keep last 200 failed jobs for debugging
        });

        console.log(`[QUEUE] ✅ Job added successfully for ${recipient}`);

        // 🔥 Wake worker to process job immediately
        wakeWorker();
    } catch (err) {
        console.error(`[QUEUE] ❌ Failed to add job:`, err.message);
        throw err;
    }

    return res.status(202).json({
        message: "Message has been queued for sending.",
    });
});

export const clearQueuedMessages = asyncHandler(async (req, res) => {
    const businessId = req.business._id.toString();

    console.log(`[CLEANUP] Clearing queued messages and jobs for business: ${businessId}`);

    try {
        // 1. Update Database Statuses
        const messageResult = await Message.updateMany(
            { businessId, status: "queued" },
            { $set: { status: "failed", errorMessage: "Forcefully cancelled by user" } }
        );

        const campaignResult = await Campaign.updateMany(
            { businessId, status: { $in: ["processing", "pending", "scheduled"] } },
            { $set: { status: "failed" } }
        );

        // 2. Clear BullMQ Jobs for this business
        // We iterate through 'waiting', 'delayed', 'paused', and 'active' jobs
        // NOTE: Active jobs are already being processed, but we can try to SIGTERM or rely on DB check in worker
        const jobsToClean = await messageQueue.getJobs(['waiting', 'delayed', 'paused', 'active']);

        let removedCount = 0;
        for (const job of jobsToClean) {
            if (job.data.businessId === businessId) {
                try {
                    await job.remove();
                    removedCount++;
                } catch (e) {
                    // Active jobs might fail to remove, but that's okay because the worker check will stop them
                    console.warn(`[CLEANUP] Could not remove ${job.id}: ${e.message}`);
                }
            }
        }

        console.log(`[CLEANUP] Successfully updated ${messageResult.modifiedCount} messages, ${campaignResult.modifiedCount} campaigns, and removed ${removedCount} jobs.`);

        res.status(200).json({
            message: "Queue cleared successfully.",
            details: {
                messagesUpdated: messageResult.modifiedCount,
                campaignsUpdated: campaignResult.modifiedCount,
                jobsRemoved: removedCount
            }
        });
    } catch (err) {
        console.error(`[CLEANUP] ❌ Failed to clear queue:`, err.message);
        res.status(500).json({ message: "Failed to clear queue", error: err.message });
    }
});
