import asyncHandler from 'express-async-handler';
import { Campaign } from '../models/campaign.model.js';
import { Business } from '../models/business.model.js';
// The import path is correct for your project structure.
import { messageQueue } from '../workers/queue.js';

export const startCampaign = asyncHandler(async (req, res) => {
    // It correctly accepts the pre-calculated 'delay' from the frontend.
    const { name, recipients, message, filePath, scheduledAt, delay } = req.body;
    const businessId = req.business._id;

    if (!name || !recipients || !message || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: 'Campaign name, message, and a list of recipients are required.' });
    }

    const currentBusiness = await Business.findById(businessId);
    if (!currentBusiness || currentBusiness.credits < recipients.length) {
        return res.status(403).json({ message: `Insufficient credits. You need ${recipients.length} credits but have ${currentBusiness.credits}.` });
    }
    
    const campaignStatus = delay > 0 ? 'scheduled' : 'processing';

    const campaign = await Campaign.create({
        name,
        businessId,
        message,
        mediaUrl: filePath,
        totalMessages: recipients.length,
        status: campaignStatus,
        scheduledAt: scheduledAt || null,
    });

    const jobOptions = {};
    if (delay > 0) {
        // It uses the frontend's delay directly, solving the timezone issue.
        jobOptions.delay = delay; 
        console.log(`Campaign ${campaign._id} scheduled with a delay of ${delay}ms.`);
    }

    for (const recipient of recipients) {
        await messageQueue.add('send-message', {
            businessId: businessId.toString(),
            campaignId: campaign._id.toString(),
            recipient,
            text: message,
            filePath: filePath,
        }, jobOptions);
    }
    
    const responseMessage = campaignStatus === 'scheduled' 
        ? 'Campaign has been successfully scheduled.' 
        : 'Campaign accepted and is now processing.';

    res.status(202).json({ 
        message: responseMessage,
        campaignId: campaign._id 
    });
});

