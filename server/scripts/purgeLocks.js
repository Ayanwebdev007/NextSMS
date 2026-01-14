import "../env.js";
import mongoose from "mongoose";
import { SessionStore } from "../models/sessionStore.model.js";

async function purge() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected. Purging all master locks...");
        const result = await SessionStore.updateMany({}, {
            $set: {
                masterId: null,
                lastHeartbeat: null,
                reconnectAttempts: 0 // Reset backoff for a fresh start
            }
        });
        console.log(`✅ Success! Purged ${result.modifiedCount} locks.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Purge failed:", err.message);
        process.exit(1);
    }
}

purge();
