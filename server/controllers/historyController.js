import asyncHandler from 'express-async-handler';
import { Campaign } from '../models/campaign.model.js';
import { Message } from '../models/message.model.js';


export const getCampaignHistory = asyncHandler(async (req, res) => {
    const campaigns = await Campaign.find({ businessId: req.business._id })
        .sort({ createdAt: -1 })
        .limit(50);
    res.status(200).json(campaigns);
});

export const getSingleMessageHistory = asyncHandler(async (req, res) => {
    const messages = await Message.find({
        businessId: req.business._id,
        campaignId: null
    })
        .sort({ createdAt: -1 })
        .limit(100);
    res.status(200).json(messages);
});
