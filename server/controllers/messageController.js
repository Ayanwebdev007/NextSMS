import asyncHandler from "express-async-handler";
import { Business } from "../models/business.model.js";
import { Message } from "../models/message.model.js";
import { messageQueue } from "../workers/queue.js";

export const sendMessage = asyncHandler(async (req, res) => {
    const { recipient, text, mediaUrl, filePath } = req.body;
    const businessId = req.business._id;

    if (!recipient || !text) {
        return res.status(400).json({
            message: "Recipient phone number and text are required.",
        });
    }

    const currentBusiness = await Business.findById(businessId);
    if (!currentBusiness || currentBusiness.credits <= 0) {
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
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            },
            removeOnComplete: 100,  // Keep last 100 completed jobs
            removeOnFail: 200       // Keep last 200 failed jobs for debugging
        });

        console.log(`[QUEUE] ✅ Job added successfully for ${recipient}`);
    } catch (err) {
        console.error(`[QUEUE] ❌ Failed to add job:`, err.message);
        throw err;
    }

    return res.status(202).json({
        message: "Message has been queued for sending.",
    });
});
