import express from 'express'
import { generateApiKey, regenerateApiKey } from '../controllers/businessController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = express.Router();

router.post('/apikey', authMiddleware, generateApiKey);
router.put('/apikey/regenerate', authMiddleware, regenerateApiKey);

export default router;