import asyncHandler from 'express-async-handler';
import { Business } from '../models/business.model.js';
// --- THIS IS THE FIX ---
// The import path is now corrected to point to the correct location inside the /workers directory.
import { messageQueue } from '../workers/queue.js'; 

export const sendSimpleMessage = asyncHandler(async (req, res) => {
    const { receiver, msgtext, mediaUrl } = req.query; 
    const businessId = req.business._id;

    if (!receiver || !msgtext) {
        return res.status(400).json({ message: 'Parameters "receiver" and "msgtext" are required.' });
    }

    const currentBusiness = await Business.findById(businessId);
    if (!currentBusiness || currentBusiness.credits <= 0) {
        return res.status(403).json({ message: 'Insufficient credits or business not found.' });
    }
    
    if (currentBusiness.sessionStatus !== 'connected') {
        return res.status(400).json({ message: 'WhatsApp session is not active. Please connect your device first.' });
    }

    try {
        await messageQueue.add('send-message', {
            businessId: businessId.toString(),
            recipient: receiver,
            text: msgtext,
            mediaUrl: mediaUrl,
        });

        res.status(202).json({ status: 'success', message: 'Message has been queued for sending.' });

    } catch (error) {
        console.error(`Failed to queue simple API message for business ${businessId}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to queue message.' });
    }
});

