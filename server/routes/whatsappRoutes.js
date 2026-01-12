import express from 'express';
const router = express.Router();
// 1. 'cancelPendingSession' has been removed as it is no longer needed.
import { connectSession, getSessionStatus, disconnectSession } from '../controllers/whatsappController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

// POST /api/session/connect - Start a session and get a QR code
router.post('/connect', authMiddleware, connectSession);

// GET /api/session/status - Check the current connection status
router.get('/status', authMiddleware, getSessionStatus);

// DELETE /api/session/disconnect - Disconnects a session
router.delete('/disconnect', authMiddleware, disconnectSession);

// 2. The '/cancel' route has been removed.

export default router;