import express from 'express'
import { sendSimpleMessage } from '../controllers/apiController.js'
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js'

const router = express.Router();

router.get('/send', apiKeyAuth, sendSimpleMessage);

export default router;