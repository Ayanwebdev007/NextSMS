
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
    {
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Business',
            unique: true, // One session per business
        },
        // We store the entire JSON dump of the creds/keys here.
        // Baileys 'useMultiFileAuthState' data will be adapted to fit here.
        data: {
            type: Object,
            default: {}
        },
    },
    { timestamps: true }
);

export const SessionStore = mongoose.model('SessionStore', sessionSchema);
