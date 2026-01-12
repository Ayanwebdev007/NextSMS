import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import asyncHandler from 'express-async-handler';
import { Business } from '../models/business.model.js';
import { OAuth2Client } from 'google-auth-library';

// This needs to be initialized to be used in the Google login function
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

export const register = asyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required fields.' });
    }

    const businessExists = await Business.findOne({ email });
    if (businessExists) {
        return res.status(409).json({ message: 'A business with this email already exists.' });
    }
    
    let userRole = 'user';
    if (email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) {
        userRole = 'admin';
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // --- THIS IS THE NEW TRIAL PLAN LOGIC ---
    // 1. Calculate the expiry date for the trial (30 days from now)
    const trialExpiryDate = new Date();
    trialExpiryDate.setDate(trialExpiryDate.getDate() + 30);

    const business = await Business.create({
        name,
        email,
        phone,
        password: hashedPassword,
        role: userRole,
        credits: 50, // 2. Assign 50 trial credits to every new user
        planExpiry: trialExpiryDate 
    });

    if (business) {
        res.status(201).json({
            _id: business.id,
            name: business.name,
            email: business.email,
            role: business.role,
            token: generateToken(business._id),
        });
    } else {
        return res.status(500).json({ message: 'Server error: Could not create business.' });
    }
});


export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const business = await Business.findOne({ email });

    if (business && (await bcrypt.compare(password, business.password))) {
        res.json({
            _id: business.id,
            name: business.name,
            email: business.email,
            role: business.role,
            token: generateToken(business._id),
        });
    } else {
        return res.status(401).json({ message: 'Invalid email or password' });
    }
});


export const handleGoogleLogin = asyncHandler(async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ message: 'Google credential token is required.' });
    }

    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, sub: googleId } = ticket.getPayload();
    let business = await Business.findOne({ googleId });

    if (!business) {
        business = await Business.findOne({ email });

        if (business) {
            business.googleId = googleId;
            await business.save();
        } else {
            // --- THIS IS THE CRITICAL FIX ---
            // When a new user is created via Google, they now also get the trial credits.
            const placeholderPassword = `google_${googleId}`;
            const trialExpiryDate = new Date();
            trialExpiryDate.setDate(trialExpiryDate.getDate() + 30);

            business = await Business.create({
                name,
                email,
                googleId,
                password: placeholderPassword,
                credits: 50, // Assign 50 trial credits
                planExpiry: trialExpiryDate // Set the 30-day trial expiry
            });
        }
    }

    if (business) {
        res.status(200).json({
            _id: business.id,
            name: business.name,
            email: business.email,
            role: business.role,
            token: generateToken(business._id),
        });
    } else {
        return res.status(500).json({ message: 'Error during Google authentication.' });
    }
});

