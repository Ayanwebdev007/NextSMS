import asyncHandler from "express-async-handler";
import dotenv from 'dotenv';
dotenv.config();
import { Plan } from "../models/plan.model.js";
import { Business } from "../models/business.model.js";
import crypto from "crypto";
import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay key_id and key_secret must be set in environment variables.");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = asyncHandler(async (req, res) => {
  const { planId } = req.body;
  const businessId = req.business?._id;

  if (!businessId) {
    return res.status(401).json({ message: "Business not authenticated" });
  }

  const plan = await Plan.findById(planId);
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  const options = {
    amount: plan.price,
    currency: "INR",
    receipt: `receipt_order_${Date.now()}`,
    notes: {
      businessId: businessId.toString(),
      planId: planId.toString(),
    },
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ message: "Error creating payment order" });
  }
});

// export const verifyTestPayment = asyncHandler(async (req, res) => {
//     // This endpoint should only be used in a development environment
//     if (process.env.NODE_ENV === 'production') {
//         res.status(403);
//         throw new Error('This endpoint is not available in production.');
//     }

//     const { planId, razorpay_payment_id } = req.body;
//     const businessId = req.business._id;

//     console.log(`[TEST] Received test payment verification for business: ${businessId}, plan: ${planId}`);

//     const business = await Business.findById(businessId);
//     const plan = await Plan.findById(planId);

//     if (business && plan) {
//         // To prevent double-adding credits even in testing, we check for the payment ID
//         if (business.processedPaymentIds.includes(razorpay_payment_id)) {
//             console.log(`[TEST] Duplicate test payment ignored for ID: ${razorpay_payment_id}`);
//             return res.status(200).json({ message: "Already verified." });
//         }

//         business.credits += plan.credits;
//         const expiryDate = new Date();
//         expiryDate.setDate(expiryDate.getDate() + plan.validityDays);
//         business.planExpiry = expiryDate;
//         business.plan = plan._id;
//         business.processedPaymentIds.push(razorpay_payment_id);

//         await business.save();
//         console.log(`✅ [TEST] Credits added successfully for business: ${businessId}`);
//         res.status(200).json({ message: "Test payment verified and credits added." });
//     } else {
//         res.status(404);
//         throw new Error("Business or Plan not found.");
//     }
// });

export const handleWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // --- THIS IS THE CRITICAL FIX ---
  // The 'req.body' is a raw Buffer because of our app.js setup. We must use it directly for verification.
  // We do NOT run JSON.stringify() on it before creating the hash.
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(req.body);
  const digest = shasum.digest("hex");

  if (digest !== req.headers["x-razorpay-signature"]) {
    console.error("Webhook verification failed. Mismatched signature.");
    return res.status(400).send("Webhook verification failed");
  }
  // --- END OF FIX ---

  // Now that the signature is verified, we can safely parse the raw body into a JSON object.
  const body = JSON.parse(req.body.toString());
  const event = body.event;

  if (event === "payment.captured" || event === "order.paid") {
    const paymentEntity = body.payload.payment.entity;
    const { id: paymentId, notes } = paymentEntity;
    const { businessId, planId } = notes;

    const business = await Business.findById(businessId);
    if (!business) {
      console.error(`Webhook Error: Business not found for ID: ${businessId}`);
      return res.status(200).json({ status: "ok" });
    }

    if (business.processedPaymentIds.includes(paymentId)) {
      console.log(`Webhook Info: Duplicate payment webhook received and ignored for payment ID: ${paymentId}`);
      return res.status(200).json({ status: "ok" });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      console.error(`Webhook Error: Plan not found for ID: ${planId}`);
      return res.status(200).json({ status: "ok" });
    }

    console.log(`✅ Payment successful for business: ${businessId}, plan: ${planId}`);

    business.credits += plan.credits;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.validityDays);
    business.planExpiry = expiryDate;
    business.plan = plan._id;
    business.processedPaymentIds.push(paymentId);

    await business.save();
    console.log(`✅ Credits added and payment ID ${paymentId} recorded for business: ${businessId}`);
  }

  res.status(200).json({ status: "ok" });
});

