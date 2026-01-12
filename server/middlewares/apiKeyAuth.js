import asyncHandler from 'express-async-handler';
import { Business } from '../models/business.model.js';

export const apiKeyAuth = asyncHandler(async (req, res, next) => {
    const apiKey = req.query.token;

    if (!apiKey) {
        return res.status(401).json({ message: 'Not authorized, no API token provided.' });
    }

    // Find the business associated with this API key
    const business = await Business.findOne({ apiKey });

    if (!business) {
        return res.status(401).json({ message: 'Not authorized, invalid API token.' });
    }

    // Attach the business to the request object, just like the JWT middleware
    req.business = business;
    next();
});