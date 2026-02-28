import asyncHandler from 'express-async-handler';
import { Business } from '../models/business.model.js';
import crypto from 'crypto';


export const generateApiKey = asyncHandler(async (req, res) => {
    const businessId = req.business._id;

    if (req.business.credits <= 100) {
        res.status(403); // 403 Forbidden
        throw new Error('You must have more than 100 credits to generate an API key. Please purchase a larger plan.');
    }

    let business = await Business.findById(businessId);

    if (!business) {
        res.status(404);
        throw new Error('Business not found.');
    }

    if (!business.apiKey) {
        console.log(`No API key found for ${business.email}. Generating a new one.`);
        const newApiKey = crypto.randomBytes(32).toString('hex');
        business.apiKey = newApiKey;
        await business.save();
    } else {
        console.log(`Existing API key found for ${business.email}. Returning existing key.`);
    }

    res.status(200).json({
        message: 'Your API Key. Keep it safe!',
        apiKey: business.apiKey
    });
});

/**
 * @desc    Regenerate API Key (Invalidates old one)
 * @route   PUT /api/business/apikey/regenerate
 * @access  Private (Business Owner)
 */
export const regenerateApiKey = asyncHandler(async (req, res) => {
    const businessId = req.business._id;

    // Optional: Keep the same credit restriction for rotation to prevent abuse
    if (req.business.credits <= 100) {
        res.status(403);
        throw new Error('You must have more than 100 credits to manage API keys.');
    }

    const business = await Business.findById(businessId);
    if (!business) {
        res.status(404);
        throw new Error('Business not found.');
    }

    // 🔥 Force generate new key (Overwrites previous one)
    const newApiKey = crypto.randomBytes(32).toString('hex');
    business.apiKey = newApiKey;
    await business.save();

    console.log(`[AUTH] API Key rotated for ${business.email}. Old key is now INVALID.`);

    res.status(200).json({
        message: 'Your API Key has been rotated. The old key is now INVALID.',
        apiKey: newApiKey
    });
});
