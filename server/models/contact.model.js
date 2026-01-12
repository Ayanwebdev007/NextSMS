import mongoose from 'mongoose';

const contactSubmissionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

export const ContactSubmission = mongoose.model('ContactSubmission', contactSubmissionSchema);
