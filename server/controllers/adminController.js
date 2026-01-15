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

    // Aggregating from both Campaigns (Bulk) and Messages (Direct/API)
    const campaignStats = await Campaign.aggregate([
        { $match: { businessId: new mongoose.Types.ObjectId(id) } },
        {
            $group: {
                _id: null,
                sent: { $sum: "$sentCount" },
                failed: { $sum: "$failedCount" },
                queued: { $sum: "$totalMessages" }
            }
        }
    ]);

    const directStats = await Message.aggregate([
        { $match: { businessId: new mongoose.Types.ObjectId(id), campaignId: null } },
        {
            $group: {
                _id: null,
                sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }
            }
        }
    ]);

    const totalSent = (campaignStats[0]?.sent || 0) + (directStats[0]?.sent || 0);
    const totalFailed = (campaignStats[0]?.failed || 0) + (directStats[0]?.failed || 0);
    const totalQueued = (campaignStats[0]?.queued || 0) + (directStats[0]?.sent || 0) + (directStats[0]?.failed || 0);

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
            totalSent,
            totalFailed,
            totalQueued
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

    const campaignKPIs = await Campaign.aggregate([
        {
            $group: {
                _id: null,
                totalSent: { $sum: "$sentCount" },
                totalFailed: { $sum: "$failedCount" }
            }
        }
    ]);

    const directKPIs = await Message.aggregate([
        { $match: { campaignId: null } },
        {
            $group: {
                _id: null,
                totalSent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
                totalFailed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }
            }
        }
    ]);

    const totalSent = (campaignKPIs[0]?.totalSent || 0) + (directKPIs[0]?.totalSent || 0);
    const totalFailed = (campaignKPIs[0]?.totalFailed || 0) + (directKPIs[0]?.totalFailed || 0);

    // 2. Message Trends (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const campaignTrends = await Campaign.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                sent: { $sum: "$sentCount" },
                failed: { $sum: "$failedCount" }
            }
        }
    ]);

    const directTrends = await Message.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo }, campaignId: null } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }
            }
        }
    ]);

    // Merge Trends
    const mergedTrendsMap = {};
    [...campaignTrends, ...directTrends].forEach(t => {
        if (!mergedTrendsMap[t._id]) mergedTrendsMap[t._id] = { _id: t._id, sent: 0, failed: 0 };
        mergedTrendsMap[t._id].sent += t.sent;
        mergedTrendsMap[t._id].failed += t.failed;
    });

    const messageTrends = Object.values(mergedTrendsMap).sort((a, b) => a._id.localeCompare(b._id));

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
            totalSent,
            totalFailed
        },
        trends: {
            messages: messageTrends,
            growth: userGrowth
        },
        recentActivity
    });
});
