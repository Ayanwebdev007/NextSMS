import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: false, 
        default: null
    },
    recipient: { 
        type: String,
        required: true
    },
    content: { // The actual text sent
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'sent', 'failed', 'read'], 
        default: 'queued'
    },
    errorMessage: { 
        type: String
    },
    sentAt: { 
        type: Date
    }
}, { timestamps: true });

export const Message = mongoose.model('Message', messageSchema);

