import express from 'express';
import { createOrder, handleWebhook} from '../controllers/paymentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// This route is protected; only a logged-in user can create an order.
router.post('/create-order', authMiddleware, createOrder);
// router.post('/verify-test-payment', authMiddleware, verifyTestPayment);


export default router;