import asyncHandler from 'express-async-handler';
import { Business } from '../models/business.model.js';
import { ContactSubmission } from '../models/contact.model.js';


export const getAllBusinesses = asyncHandler(async (req, res) => {
    const businesses = await Business.find({})
        .select('-password') // Exclude passwords for security
        .populate('plan');
    res.status(200).json(businesses);
});


export const updateBusinessStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const business = await Business.findById(req.params.id);

    if (business) {
        business.status = status || business.status;
        const updatedBusiness = await business.save();
        res.status(200).json({
            _id: updatedBusiness._id,
            name: updatedBusiness.name,
            email: updatedBusiness.email,
            status: updatedBusiness.status,
        });
    } else {
        res.status(404);
        throw new Error('Business not found');
    }
});
export const getContactSubmissions = asyncHandler(async (req, res) => {
    const submissions = await ContactSubmission.find({}).sort({ createdAt: -1 }); // Get newest first
    res.status(200).json(submissions);
});
