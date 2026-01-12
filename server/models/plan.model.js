import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    price: {
        type: Number, 
        required: true
    },
    credits: {
        type: Number, // How many message credits this plan provides
        required: true
    },
    validityDays: {
        type: Number, // Duration of the plan in days
        required: true
    },
    isActive: { // A flag to easily enable or disable a plan from being offered
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const Plan = mongoose.model('Plan', planSchema);
