import "../env.js";
import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
    };

async function clearQueue() {
    const queueName = "nextsms_prod_v1";
    console.log(`Connecting to Redis for queue: ${queueName}...`);
    const myQueue = new Queue(queueName, { connection });

    try {
        console.log("Draining queue (waiting/delayed/failed)...");
        await myQueue.drain();
        console.log("Queue drained successfully.");

        console.log("Obliterating queue states...");
        await myQueue.obliterate({ force: true });
        console.log("✅ Queue cleared completely. You can now send new messages.");

        process.exit(0);
    } catch (err) {
        console.error("❌ Failed to clear queue:", err.message);
        process.exit(1);
    }
}

clearQueue();
