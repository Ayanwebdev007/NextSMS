import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';

import connectDB from './db/db.js';
import { clients, restoreSessions } from './controllers/whatsappController.js';
import { handleWebhook } from './controllers/paymentController.js';
import './worker.js'

connectDB().then(() => {
  restoreSessions();
});
const app = express();
const corsOptions = {
  origin: process.env.FRONTEND_URL, // Only allow your frontend
};
app.use(cors(corsOptions));



// Note: express.json() should NOT be used for webhook route, so webhook route is defined before paymentRoutes below.
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);


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

// Other payment routes
app.use('/api/payment', paymentRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('listening on port', PORT);
});

// --- Graceful shutdown --- //
process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: Gracefully destroying WhatsApp clients...');
  server.close(async () => {
    console.log('HTTP server closed.');
    const destroyPromises = Object.values(clients).map((clientData) => {
      if (clientData && clientData.instance) {
        console.log(`Destroying client for business...`);
        // Using .destroy() will close the connection but PRESERVE the auth files for restoration.
        return clientData.instance.logout();
      }
      return Promise.resolve();
    });

    await Promise.all(destroyPromises);
    console.log('All WhatsApp clients destroyed.');
    process.exit(0);
  });
});

