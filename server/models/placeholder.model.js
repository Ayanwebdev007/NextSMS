import mongoose from 'mongoose';

const placeholderSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

// Ensure uniqueness of placeholder name per business
placeholderSchema.index({ businessId: 1, name: 1 }, { unique: true });

export const Placeholder = mongoose.model('Placeholder', placeholderSchema);
