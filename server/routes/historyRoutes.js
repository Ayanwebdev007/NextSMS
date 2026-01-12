import express from 'express';
import { getCampaignHistory, getSingleMessageHistory } from '../controllers/historyController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes in this file are protected and require a valid user token
router.use(authMiddleware);

router.get('/campaigns', getCampaignHistory);
router.get('/messages', getSingleMessageHistory);

export default router;