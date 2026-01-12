import express from 'express'
import { uploadMedia } from '../controllers/mediaController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
const router = express.Router();
router.post('/upload', authMiddleware, upload.single('media'), uploadMedia);

export default router;