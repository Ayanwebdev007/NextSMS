import express from 'express';
import { startCampaign, pauseCampaign, resumeCampaign } from '../controllers/campaignController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.post('/start', authMiddleware, startCampaign);
router.post('/pause/:campaignId', authMiddleware, pauseCampaign);
router.post('/resume/:campaignId', authMiddleware, resumeCampaign);

export default router;