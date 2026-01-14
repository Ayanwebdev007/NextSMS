// NextSMS - Multi-tenant WhatsApp Solution
// Deploy Version: 1.0.1 - Testing CI/CD Fix
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
import cors from 'cors';

import connectDB from './db/db.js';
import { clients, restoreSessions } from './controllers/whatsappController.js';
import { handleWebhook } from './controllers/paymentController.js';
import { startKeepAlive } from './utils/keepAlive.js';

connectDB().then(async () => {
  await restoreSessions();

  // Start keep-alive mechanism for Render free tier
  if (process.env.NODE_ENV === 'production') {
    startKeepAlive();
  }

  try {
    const { startWorker } = await import('./worker.js');
    await startWorker();
  } catch (err) {
    console.error("[CRITICAL] Failed to start worker:", err.message);
  }
});
const app = express();

// --- Health Check for UptimeRobot --- //
app.get('/ping', (req, res) => {
  console.log('[MONITOR] Server pinged at', new Date().toISOString());
  res.send('pong');
});
app.get('/api/health', (req, res) => {
  console.log('[HEALTH] Health check at', new Date().toISOString());
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
app.get('/', (req, res) => res.send('NextSMS Server is Online 🚀'));
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'https://nextsms-client.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter(Boolean),
  credentials: true,
};
app.use(cors(corsOptions));



// Note: express.json() should NOT be used for webhook route, so webhook route is defined before paymentRoutes below.
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);


// Health check already defined at top


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes --- //
import authRoutes from './routes/authRoutes.js';
import planRoutes from './routes/planRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import apiRoutes from './routes/ApiRoutes.js';
import businessRoutes from './routes/businessroutes.js';
import adminRoutes from './routes/adminRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import placeholderRoutes from './routes/placeholderRoutes.js';

app.use('/uploads', express.static('uploads'));
//  all routes 
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/session', whatsappRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/whatsapp', apiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/placeholders', placeholderRoutes);

// Other payment routes
app.use('/api/payment', paymentRoutes);

// --- Serve Frontend in Production --- //
// Serve static files from the React app
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// The "catch-all" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('listening on port', PORT);
});

// --- Graceful shutdown --- //
process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: Gracefully closing server...');
  server.close(async () => {
    console.log('HTTP server closed.');

    // ZERO-DELETION POLICY: Do NOT logout or destroy WhatsApp clients on restart
    // Sessions are persisted in MongoDB and will be restored on next startup
    Object.values(clients).forEach((clientData) => {
      if (clientData && clientData.sock) {
        console.log(`Preserving WhatsApp session for next restart...`);
        // Just end the socket connection gracefully, but keep auth data
        try {
          clientData.sock.end();
        } catch (e) {
          // Ignore errors during shutdown
        }
      }
    });

    console.log('All WhatsApp sessions preserved. Ready for restart.');
    process.exit(0);
  });
});
