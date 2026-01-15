import "../env.js";
import { messageQueue } from "../workers/queue.js";
import { Message } from "../models/message.model.js";
import mongoose from "mongoose";

const TEST_BUSINESS_ID = "69654cb92789a5f6f8b71b6e"; // From logs
const BURST_COUNT = 30; // 30 messages in one burst

async function runStressTest() {
    console.log("🚀 Starting In-Depth Stability Test...");
    console.log(`Target Business: ${TEST_BUSINESS_ID}`);
    console.log(`Burst Size: ${BURST_COUNT} messages`);

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        console.log(`📦 Injecting ${BURST_COUNT} jobs into queue...`);
        const startTime = Date.now();

        const jobs = [];
        for (let i = 1; i <= BURST_COUNT; i++) {
            // Create DB record
            const msg = await Message.create({
                businessId: TEST_BUSINESS_ID,
                recipient: "916296314040", // Testing number
                content: `STRESS TEST MESSAGE #${i} - [${new Date().toLocaleTimeString()}]`,
                status: "queued"
            });

            // Add to BullMQ with unified naming
            jobs.push(
                messageQueue.add(`send_${TEST_BUSINESS_ID}`, {
                    messageId: msg._id.toString(),
                    businessId: TEST_BUSINESS_ID,
                    recipient: "916296314040",
                    text: msg.content
                }, {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: true,
                    removeOnFail: false
                })
            );
        }

        await Promise.all(jobs);
        const duration = Date.now() - startTime;
        console.log(`✅ All ${BURST_COUNT} jobs injected in ${duration}ms`);
        console.log("\n🧪 MONITORING MODE:");
        console.log("Please run 'pm2 logs 4' to verify parallel delivery and Redis sync.");

        // Wait bit to let initial logs flush
        setTimeout(() => {
            console.log("Done. Check logs now.");
            process.exit(0);
        }, 5000);

    } catch (err) {
        console.error("❌ Test Failed:", err.message);
        process.exit(1);
    }
}

runStressTest();
