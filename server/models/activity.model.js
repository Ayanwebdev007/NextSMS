import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    event: {
        type: String,
        required: true,
        enum: ['connected', 'disconnected', 'auth_failure', 'reconnecting', 'qr_generated']
    },
    details: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export const Activity = mongoose.model('Activity', activitySchema);
