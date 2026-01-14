import asyncHandler from 'express-async-handler';
import { Business } from '../models/business.model.js';
import { Message } from '../models/message.model.js';
import { messageQueue } from '../workers/queue.js';

export const sendSimpleMessage = asyncHandler(async (req, res) => {
    // Support both GET (query) and POST (body)
    const receiver = req.query.receiver || req.body.receiver;
    const msgtext = req.query.msgtext || req.body.msgtext;
    const mediaUrl = req.query.mediaUrl || req.body.mediaUrl;

    const businessId = req.business._id;

    if (!receiver || !msgtext) {
        return res.status(400).json({
            status: 'error',
            message: 'Parameters "receiver" and "msgtext" are required.'
        });
    }

    const currentBusiness = await Business.findById(businessId);
    if (!currentBusiness || currentBusiness.credits <= 0) {
        return res.status(403).json({
            status: 'error',
            message: 'Insufficient credits or business not found.'
        });
    }

    if (currentBusiness.sessionStatus !== 'connected') {
        return res.status(400).json({
            status: 'error',
            message: 'WhatsApp session is not active. Please connect your device first.'
        });
    }

    // 🔴 CRITICAL FIX: Create DB record so API messages show in Dashboard History
    const messageRecord = await Message.create({
        businessId: businessId.toString(),
        recipient: receiver,
        content: msgtext,
        status: "queued"
    });

    try {
        // UNIFIED JOB NAMING: send_${businessId}
        await messageQueue.add(`send_${businessId.toString()}`, {
            messageId: messageRecord._id.toString(),
            businessId: businessId.toString(),
            recipient: receiver,
            text: msgtext,
            mediaUrl: mediaUrl,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 200
        });

        res.status(202).json({
            status: 'success',
            message: 'Message has been queued for sending.',
            messageId: messageRecord._id
        });

    } catch (error) {
        console.error(`Failed to queue simple API message for business ${businessId}:`, error);

        // Update DB record as failed if queue injection fails
        await Message.findByIdAndUpdate(messageRecord._id, {
            status: 'failed',
            errorMessage: 'Queue injection failed: ' + error.message
        });

        res.status(500).json({ status: 'error', message: 'Failed to queue message.' });
    }
});

