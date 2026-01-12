import express from 'express'
import { sendMessage } from '../controllers/messageController.js'
import {authMiddleware} from '../middlewares/authMiddleware.js'

const router = express.Router();
router.post('/send',authMiddleware,sendMessage)
export default router