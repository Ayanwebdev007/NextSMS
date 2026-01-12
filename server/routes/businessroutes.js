import express from 'express'
import { generateApiKey } from '../controllers/businessController.js'
import {authMiddleware} from '../middlewares/authMiddleware.js'

const router = express.Router();

router.post('/apikey', authMiddleware, generateApiKey);

export default router;