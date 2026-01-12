import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { Business } from '../models/business.model.js';
import { ContactSubmission } from '../models/contact.model.js';
import { Campaign } from '../models/campaign.model.js';
import { Message } from '../models/message.model.js';
import { Activity } from '../models/activity.model.js';


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

export const getBusinessActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // 1. Get Campaign Stats
    const campaignsCount = await Campaign.countDocuments({ businessId: id });
    const messageStats = await Campaign.aggregate([
        { $match: { businessId: new mongoose.Types.ObjectId(id) } },
        {
            $group: {
                _id: null,
                totalSent: { $sum: "$sentCount" },
                totalFailed: { $sum: "$failedCount" },
                totalQueued: { $sum: "$totalMessages" }
            }
        }
    ]);

    // 2. Get Recent Campaigns
    const recentCampaigns = await Campaign.find({ businessId: id })
        .sort({ createdAt: -1 })
        .limit(5);

    // 3. Get Recent Individual Messages
    const recentMessages = await Message.find({ businessId: id })
        .sort({ createdAt: -1 })
        .limit(10);

    // 4. Get Connectivity History
    const connectivityHistory = await Activity.find({ businessId: id })
        .sort({ createdAt: -1 })
        .limit(10);

    res.status(200).json({
        stats: {
            campaignsCount,
            totalSent: messageStats[0]?.totalSent || 0,
            totalFailed: messageStats[0]?.totalFailed || 0,
            totalQueued: messageStats[0]?.totalQueued || 0
        },
        recentCampaigns,
        recentMessages,
        connectivityHistory
    });
});

export const getAdminDashboardStats = asyncHandler(async (req, res) => {
    // 1. Core KPIs
    const totalUsers = await Business.countDocuments();
    const totalCampaigns = await Campaign.countDocuments();
    const activeSessions = await Business.countDocuments({ sessionStatus: 'connected' });

    const globalMessageStats = await Campaign.aggregate([
        {
            $group: {
                _id: null,
                totalSent: { $sum: "$sentCount" },
                totalFailed: { $sum: "$failedCount" }
            }
        }
    ]);

    // 2. Message Trends (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messageTrends = await Campaign.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                sent: { $sum: "$sentCount" },
                failed: { $sum: "$failedCount" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    // 3. User Growth (Last 7 Days)
    const userGrowth = await Business.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    // 4. Global Recent Activity
    const recentActivity = await Activity.find({})
        .populate('businessId', 'name')
        .sort({ createdAt: -1 })
        .limit(8);

    res.status(200).json({
        kpis: {
            totalUsers,
            totalCampaigns,
            activeSessions,
            totalSent: globalMessageStats[0]?.totalSent || 0,
            totalFailed: globalMessageStats[0]?.totalFailed || 0
        },
        trends: {
            messages: messageTrends,
            growth: userGrowth
        },
        recentActivity
    });
});
