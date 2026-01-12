import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
    name: { 
        type: String,
        required: true
    },
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    // You can also add support for media URLs here
    mediaUrl: { type: String },

    status: {
        type: String,
        enum: ['pending', 'processing', 'paused', 'completed', 'failed','scheduled'],
        default: 'pending'
    },
    
    // Statistics for the dashboard
    totalMessages: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },

    // For scheduled campaigns
    scheduledAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

export const Campaign = mongoose.model('Campaign', campaignSchema);