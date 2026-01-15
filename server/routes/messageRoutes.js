import express from 'express';
import { sendMessage, clearQueuedMessages } from '../controllers/messageController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router();
router.post('/send', authMiddleware, sendMessage)
router.post('/clear-queue', authMiddleware, clearQueuedMessages)
export default router