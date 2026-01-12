import asyncHandler from 'express-async-handler';
import { ContactSubmission } from '../models/contact.model.js';


export const handleContactForm = asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        res.status(400);
        throw new Error("Please fill out all fields.");
    }

    try {
        await ContactSubmission.create({ name, email, message });
        console.log(`✅ New contact submission from ${name} saved to database.`);

        res.status(200).json({ message: "Your message has been received! We'll get back to you soon." });

    } catch (dbError) {
        console.error("Database Error: Could not save contact submission.", dbError);
        res.status(500);
        throw new Error("Sorry, there was a problem saving your message.");
    }

});

