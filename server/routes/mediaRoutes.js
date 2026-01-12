import express from 'express'
import { uploadMedia } from '../controllers/mediaController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
import multer from 'multer';

const router = express.Router();

router.post('/upload', authMiddleware, (req, res, next) => {
    upload.single('media')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Multer error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, uploadMedia);

export default router;