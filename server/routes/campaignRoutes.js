import express from 'express';
import { startCampaign } from '../controllers/campaignController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.post('/start', authMiddleware, startCampaign);

export default router;