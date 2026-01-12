import { authMiddleware } from './authMiddleware.js'; 
import asyncHandler from 'express-async-handler';


export const protectAdmin = asyncHandler(async (req, res, next) => {
   
    authMiddleware(req, res, () => {
        
        if (req.business && req.business.role === 'admin') {
            next(); // User is an admin, proceed to the next function
        } else {
            res.status(403); // 403 Forbidden
            throw new Error('Not authorized as an admin.');
        }
    });
});
