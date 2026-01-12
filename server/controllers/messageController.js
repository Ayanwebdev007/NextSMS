import asyncHandler from "express-async-handler";
import { Business } from "../models/business.model.js";
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

    await messageQueue.add("send-message", {
        businessId: businessId.toString(),
        recipient,
        text,
        filePath,
        mediaUrl,
    });

    return res.status(202).json({
        message: "Message has been queued for sending.",
    });
});
