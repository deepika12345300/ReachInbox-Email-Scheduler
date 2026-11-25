
import { Router } from "express";
import {
    getEmailRateLimit,
    updateEmailRateLimit
} from "../services/rateLimiter.js";

const router = Router();

// Get current hourly email limit
router.get("/settings/rate-limit", async (_req, res) => {
    try {
        const limit = await getEmailRateLimit();

        res.json({
            success: true,
            emailsPerHourLimit: limit
        });
    } catch (error) {
        console.error("Get rate limit error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get hourly email limit"
        });
    }
});

// Update hourly email limit
router.put("/settings/rate-limit", async (req, res) => {
    try {
        const limit = Number(req.body.emailsPerHourLimit);

        if (!Number.isInteger(limit) || limit < 1) {
            res.status(400).json({
                success: false,
                message: "Enter a valid positive integer"
            });
            return;
        }

        const updatedLimit = await updateEmailRateLimit(limit);

        res.json({
            success: true,
            message: "Hourly email limit updated successfully",
            emailsPerHourLimit: updatedLimit
        });
    } catch (error) {
        console.error("Update rate limit error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update hourly email limit"
        });
    }
});

export default router;
