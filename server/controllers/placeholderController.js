import asyncHandler from 'express-async-handler';
import { Placeholder } from '../models/placeholder.model.js';

// @desc    Get all placeholders for a business
// @route   GET /api/placeholders
// @access  Private
export const getPlaceholders = asyncHandler(async (req, res) => {
    const placeholders = await Placeholder.find({ businessId: req.business._id });
    res.json(placeholders);
});

// @desc    Create a new placeholder
// @route   POST /api/placeholders
// @access  Private
export const createPlaceholder = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name) {
        res.status(400);
        throw new Error('Placeholder name is required');
    }

    const cleanName = name.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanName) {
        res.status(400);
        throw new Error('Invalid placeholder name');
    }

    // Check if exists
    const exists = await Placeholder.findOne({ businessId: req.business._id, name: cleanName });
    if (exists) {
        res.status(400);
        throw new Error('Placeholder already exists');
    }

    const placeholder = await Placeholder.create({
        businessId: req.business._id,
        name: cleanName
    });

    res.status(201).json(placeholder);
});

// @desc    Delete a placeholder
// @route   DELETE /api/placeholders/:id
// @access  Private
export const deletePlaceholder = asyncHandler(async (req, res) => {
    const placeholder = await Placeholder.findOne({ _id: req.params.id, businessId: req.business._id });

    if (!placeholder) {
        res.status(404);
        throw new Error('Placeholder not found');
    }

    await placeholder.deleteOne();
    res.json({ message: 'Placeholder removed' });
});
