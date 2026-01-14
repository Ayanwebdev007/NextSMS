console.log('\n\n' + '='.repeat(50));
console.log('🚀 NEXTSMS SERVER STARTING - VERSION 1.1.21');
console.log('='.repeat(50) + '\n\n');

import './env.js';
import express from 'express';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientBuildPath = path.resolve(__dirname, '../client/dist');
import cors from 'cors';

import connectDB from './db/db.js';
import { clients, restoreSessions } from './controllers/whatsappController.js';
import { handleWebhook } from './controllers/paymentController.js';
import { startKeepAlive } from './utils/keepAlive.js';

connectDB().then(async () => {
  // await restoreSessions(); // MOVED TO START_SERVER SUCCESS

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

app.get('/api/debug/status', (req, res) => {
  const activeClients = Object.keys(clients).map(id => ({
    id,
    status: clients[id].status,
    hasSock: !!clients[id].sock,
    hasUser: !!clients[id].sock?.user
  }));

  res.json({
    instance: `${os.hostname()}-${process.pid}`,
    version: '1.1.20',
    activeClients,
    redis: process.env.REDIS_URL ? 'URL SET' : `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
  });
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

const PORT = 5000;
let server;

const startServer = async (retries = 3) => {
  try {
    server = app.listen(PORT); // Logs moved to 'listening' event to avoid race conditions

    server.on('listening', async () => {
      console.log(`\n💎 [NEXTSMS-STABLE] API IS LIVE ON PORT ${PORT}`);
      console.log(`💎 [NEXTSMS-STABLE] Mode: ${process.env.NODE_ENV || 'development'}\n`);

      // ONLY restore sessions if we successfully bound to the port
      // This prevents "zombie" processes from connecting to WA
      try {
        const { restoreSessions } = await import('./controllers/whatsappController.js');
        await restoreSessions();
      } catch (e) { console.error('Failed to restore sessions:', e); }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[CRITICAL] PORT ${PORT} IS BUSY.`);
        if (retries > 0) {
          console.log(`[AUTO-FIX] Killing blocker on port ${PORT}... (Attempt ${4 - retries}/3)`);

          // Forcefully kill any process on port 5000
          exec(`fuser -k -n tcp ${PORT} || lsof -t -i:${PORT} | xargs kill -9`, (e) => {
            // Even if fuser finds nothing (exit code 1), we proceed to retry
            console.log('[AUTO-FIX] Kill command executed. Waiting 5s for OS to release port...');

            setTimeout(() => {
              console.log('Retrying server start...');
              try { server.close(); } catch (e) { }
              startServer(retries - 1);
            }, 5000);
          });
        } else {
          console.error('[FATAL] Could not clear port 5000 after 3 attempts. Process will exit.');
          process.exit(1);
        }
      } else {
        throw err;
      }
    });
  } catch (e) {
    console.error('Server start error:', e);
  }
};

startServer();

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
