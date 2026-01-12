import express from 'express';
const router = express.Router();
import { register,login,handleGoogleLogin } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

router.post('/register',register)
router.post('/login',login)
router.post('/google', handleGoogleLogin);
router.get('/me', authMiddleware, (req, res) => {
    // req.business is made available by the authMiddleware
    res.status(200).json(req.business);
});


export default router