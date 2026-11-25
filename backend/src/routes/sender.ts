
import { Router } from "express";
import prisma from "../config/database.js";

const router = Router();

// Create a new sender
router.post("/senders", async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || typeof email !== "string") {
            return res.status(400).json({
                success: false,
                message: "Sender email is required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid sender email"
            });
        }

        const user = await prisma.user.upsert({
            where: { email: "demo@reachinbox.local" },
            update: {},
            create: {
                name: "Demo User",
                email: "demo@reachinbox.local"
            }
        });

        const existingSender = await prisma.sender.findFirst({
            where: {
                email: normalizedEmail,
                userId: user.id
            }
        });

        if (existingSender) {
            return res.status(409).json({
                success: false,
                message: "Sender already exists"
            });
        }

        const sender = await prisma.sender.create({
            data: {
                email: normalizedEmail,
                name: name?.trim() || null,
                userId: user.id
            }
        });

        return res.status(201).json({
            success: true,
            message: "Sender added successfully!",
            sender
        });

    } catch (error) {
        console.error("Add sender error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add sender"
        });
    }
});

// Get all senders
router.get("/senders", async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: "demo@reachinbox.local" }
        });

        if (!user) {
            return res.json({
                success: true,
                count: 0,
                senders: []
            });
        }

        const senders = await prisma.sender.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" }
        });

        return res.status(200).json({
            success: true,
            count: senders.length,
            senders
        });

    } catch (error) {
        console.error("Get senders error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch senders"
        });
    }
});

export default router;
