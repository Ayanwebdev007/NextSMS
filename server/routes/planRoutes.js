import express from "express";
import { getActivePlans } from "../controllers/planController.js";
import { createOrder, handleWebhook } from "../controllers/paymentController.js";

const router = express.Router();

// Public route for fetching active plans
router.get("/", getActivePlans);

// Payment routes
router.post("/order", createOrder);
router.post("/webhook", handleWebhook);

export default router;
