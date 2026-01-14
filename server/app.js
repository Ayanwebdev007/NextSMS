console.log('\n\n' + '='.repeat(50));
console.log('🚀 NEXTSMS SERVER STARTING - VERSION 1.1.8');
console.log('='.repeat(50) + '\n\n');

import './env.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientBuildPath = path.resolve(__dirname, '../client/dist');
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

// --- SUPER LOGGER (Hits everything first) --- //
app.use((req, res, next) => {
  console.log(`[REVERSE-PROXY] ${req.method} ${req.url}`);
  next();
});

// --- Diagnostic Routes (Top Level) --- //
app.get('/ping', (req, res) => res.send('pong'));
app.get('/api/test', (req, res) => res.json({
  message: 'API is reachable',
  url: req.url,
  env: process.env.NODE_ENV
}));

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});
// Dummy root removed to allow React app to load via static middleware

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

// Fix for Google OAuth COOP issue
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Request Logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});



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
// --- 2. Middleware & All API Routes --- //
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
app.use('/api/payment', paymentRoutes);

// --- 3. Static Files --- //
app.use('/uploads', express.static('uploads'));
app.use(express.static(clientBuildPath));

// --- 4. THE ULTIMATE CATCH-ALL (SPA Support) --- //
// This MUST be the last route. We use app.use to avoid PathError crash.
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.url.startsWith('/api')) {
    return next();
  }

  const indexPath = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(404).json({ error: 'Not Found', path: req.url });
      }
    }
  });
});

const PORT = 5005; // HARDCODED TO BYPASS GHOST PROCESS ON 5000
const server = app.listen(PORT, () => {
  console.log(`\n💎 [NEXTSMS-STABLE] API IS LIVE ON PORT ${PORT}`);
  console.log(`💎 [NEXTSMS-STABLE] Mode: ${process.env.NODE_ENV || 'development'}\n`);
});

// --- Global Error Handler --- //
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
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
