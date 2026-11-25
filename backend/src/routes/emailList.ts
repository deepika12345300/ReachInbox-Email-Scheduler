
import { Router } from "express";
import prisma from "../config/database.js";

const router = Router();
console.log("EMAIL LIST ROUTE LOADED");

// Get scheduled emails
router.get("/emails/scheduled", async (req, res) => {
    console.log("EMAIL LIST API CALLED");
    try {
        const emails = await prisma.email.findMany({
            where: {
                status: "SCHEDULED"
            },
            include: {
                recipients: true,
                sender: true
            },
            orderBy: {
                scheduledAt: "asc"
            }
        });

        return res.json({
            success: true,
            count: emails.length,
            emails
        });

    } catch (error) {
        console.error("Scheduled emails error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch scheduled emails"
        });
    }
});

// Get sent emails
router.get("/emails/sent", async (req, res) => {
    try {
        const emails = await prisma.email.findMany({
            where: {
                status: "SENT"
            },
            include: {
                recipients: true,
                sender: true
            },
            orderBy: {
                sentAt: "desc"
            }
        });

        return res.json({
            success: true,
            count: emails.length,
            emails
        });

    } catch (error) {
        console.error("Sent emails error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch sent emails"
        });
    }
});

export default router;
