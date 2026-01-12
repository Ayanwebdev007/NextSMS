import asyncHandler from 'express-async-handler';
import { Plan } from '../models/plan.model.js';


export const createPlan = asyncHandler(async (req, res) => {
    const { name, price, credits, validityDays } = req.body;

   
    if (!name || price === undefined || credits === undefined || validityDays === undefined) {
        return res.status(400).json({ message: 'Please provide all required fields: name, price, credits, and validityDays.' });
    }

    const planExists = await Plan.findOne({ name });
    if (planExists) {
        return res.status(409).json({ message: 'A plan with this name already exists.' });
    }


    const plan = await Plan.create({
        name,
        price,
        credits,
        validityDays,
    });


    res.status(201).json(plan);
});

export const getActivePlans = asyncHandler(async (req, res) => {
    
    const plans = await Plan.find({ isActive: true }).select('-isActive -__v'); // Hide internal fields
    res.status(200).json(plans);
});

export const getAllPlans = asyncHandler(async (req, res) => {
    const plans = await Plan.find({}); 
    res.status(200).json(plans);
});

export const updatePlan = asyncHandler(async (req, res) => {
    const { name, price, credits, validityDays, isActive } = req.body;
    const plan = await Plan.findById(req.params.id);

    if (plan) {
        plan.name = name || plan.name;
        // Check if price is provided before converting, as it might not be in every update
        if (price !== undefined) {
             plan.price = price;
        }
        plan.credits = credits || plan.credits;
        plan.validityDays = validityDays || plan.validityDays;
       
        if (isActive !== undefined) {
            plan.isActive = isActive;
        }
        
        const updatedPlan = await plan.save();
        res.status(200).json(updatedPlan);
    } else {
        res.status(404);
        throw new Error('Plan not found');
    }
});


