import asyncHandler from 'express-async-handler';
import { Business } from '../models/business.model.js';
import { ContactSubmission } from '../models/contact.model.js';


export const getAllBusinesses = asyncHandler(async (req, res) => {
    const businesses = await Business.find({})
        .select('-password') // Exclude passwords for security
        .populate('plan');
    res.status(200).json(businesses);
});


export const updateBusinessStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const business = await Business.findById(req.params.id);

    if (business) {
        business.status = status || business.status;
        const updatedBusiness = await business.save();
        res.status(200).json({
            _id: updatedBusiness._id,
            name: updatedBusiness.name,
            email: updatedBusiness.email,
            status: updatedBusiness.status,
        });
    } else {
        res.status(404);
        throw new Error('Business not found');
    }
});
export const getContactSubmissions = asyncHandler(async (req, res) => {
    const submissions = await ContactSubmission.find({}).sort({ createdAt: -1 }); // Get newest first
    res.status(200).json(submissions);
});

import { Plan } from '../models/plan.model.js';

export const updateBusinessCredits = asyncHandler(async (req, res) => {
    const { credits, planExpiry, planId } = req.body;
    const business = await Business.findById(req.params.id);

    if (!business) {
        res.status(404);
        throw new Error('Business not found');
    }

    if (planId) {
        const plan = await Plan.findById(planId);
        if (!plan) {
            res.status(404);
            throw new Error('Plan not found');
        }

        // Add plan credits and set expiry
        business.credits += plan.credits;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.validityDays);
        business.planExpiry = expiryDate;
        business.plan = plan._id;
    } else {
        // Manual custom update
        if (credits !== undefined) business.credits = credits;
        if (planExpiry !== undefined) business.planExpiry = new Date(planExpiry);
    }

    await business.save();
    res.status(200).json({
        message: "Credits and plan updated successfully",
        credits: business.credits,
        planExpiry: business.planExpiry,
        plan: business.plan
    });
});
