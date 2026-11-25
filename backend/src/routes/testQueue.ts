
import { Router } from "express";
import emailQueue from "../queues/emailQueue.js";

const router = Router();

router.get("/test-queue", async (req, res) => {
    try {
        const job = await emailQueue.add("test-email", {
            to: "test@example.com",
            subject: "BullMQ Test",
            body: "Testing ReachInbox email queue"
        });

        res.json({
            success: true,
            message: "Job added successfully!",
            jobId: job.id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to add job"
        });
    }
});

export default router;
