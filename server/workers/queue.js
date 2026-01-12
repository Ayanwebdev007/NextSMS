import bullmq from 'bullmq';

import { Queue } from 'bullmq';

// Define the connection details for your Redis server
const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  };

// This file now only defines and exports the queue.
// The worker process will listen for jobs on this same 'messages' queue.
export const messageQueue = new Queue('messages', { connection });