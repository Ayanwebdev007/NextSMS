import express from 'express';
import { getPlaceholders, createPlaceholder, deletePlaceholder } from '../controllers/placeholderController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getPlaceholders);
router.post('/', authMiddleware, createPlaceholder);
router.delete('/:id', authMiddleware, deletePlaceholder);

export default router;
