import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    googleId: { // For Google OAuth
        type: String,
        unique: true,
        sparse: true // Allows null values to not violate uniqueness
    },
    password: { // Hashed password, not required if using Google login
        type: String 
    },
    
    // Plan & Subscription Details
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        default: null // Initially no plan
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user' // All new signups will be regular users by default
    },
    phone: {
        type: String,
        required: false
    },
    credits: { 
        type: Number, 
        default: 0 
    },
    planExpiry: { 
        type: Date 
    },

    // WhatsApp Session Details
    session: {
        // This object structure comes from whatsapp-web.js
        WABrowserId: String,
        WASecretBundle: mongoose.Schema.Types.Mixed,
        WAToken1: String,
        WAToken2: String
    },
    sessionStatus: {
        type: String,
        enum: ['disconnected', 'qr_pending', 'connected', 'error'],
        default: 'disconnected'
    },
    
    // Account Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
     apiKey: {
        type: String,
        unique: true,
        sparse: true // Ensures uniqueness but allows null/missing values
    },
    processedPaymentIds: {
        type: [String],
        default: [],
    }
}, { timestamps: true }); // `timestamps` adds `createdAt` and `updatedAt`

export const Business = mongoose.model('Business', businessSchema);