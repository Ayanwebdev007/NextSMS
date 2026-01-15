import express from 'express';
import { startCampaign, pauseCampaign, resumeCampaign, deleteCampaign } from '../controllers/campaignController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.post('/start', authMiddleware, startCampaign);
router.post('/pause/:campaignId', authMiddleware, pauseCampaign);
router.post('/resume/:campaignId', authMiddleware, resumeCampaign);
router.delete('/:campaignId', authMiddleware, deleteCampaign);

export default router;