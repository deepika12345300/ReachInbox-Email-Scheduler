
import { Router } from "express";
import emailQueue from "../queues/emailQueue.js";
import prisma from "../config/database.js";
import { indexEmail } from "../services/elasticsearchService.js";

const router = Router();

router.post("/schedule-email", async (req, res) => {
    let emailId: string | undefined;

    try {
        const {
            to,
            recipients: inputRecipients,
            subject,
            body,
            scheduledAt,
            senderId
        } = req.body;

        // Validate required fields
        if ((!to && !inputRecipients) || !subject || !body || !scheduledAt) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Validate sender selection
        if (!senderId || typeof senderId !== "string") {
            return res.status(400).json({
                success: false,
                message: "Please select a sender"
            });
        }

        // Support single or multiple recipients
        const recipients: string[] = Array.isArray(inputRecipients)
            ? inputRecipients
            : [to];

        const validRecipients = recipients
            .filter((email): email is string => typeof email === "string")
            .map(email => email.trim().toLowerCase())
            .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

        if (
            validRecipients.length === 0 ||
            validRecipients.length !== recipients.length
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid recipient email addresses"
            });
        }

        // Remove duplicate addresses
        const uniqueRecipients = [...new Set(validRecipients)];

        // Validate scheduled time
        const scheduledTime = new Date(scheduledAt);
        const delay = scheduledTime.getTime() - Date.now();

        if (Number.isNaN(scheduledTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid scheduled date"
            });
        }

        if (delay < 1000) {
            return res.status(400).json({
                success: false,
                message: "Please select a future time"
            });
        }

        // Create or reuse demo user
        const user = await prisma.user.upsert({
            where: {
                email: "demo@reachinbox.local"
            },
            update: {},
            create: {
                name: "Demo User",
                email: "demo@reachinbox.local"
            }
        });

        // Find selected sender belonging to this user
        const sender = await prisma.sender.findFirst({
            where: {
                id: senderId,
                userId: user.id
            }
        });

        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "Selected sender not found"
            });
        }

        // Save email and recipients in PostgreSQL
        const email = await prisma.email.create({
            data: {
                subject,
                body,
                scheduledAt: scheduledTime,
                status: "SCHEDULED",
                senderId: sender.id,
                recipients: {
                    create: uniqueRecipients.map(address => ({
                        address
                    }))
                }
            },
            include: {
                recipients: true
            }
        });

        emailId = email.id;

        // Add delayed job to BullMQ
        const job = await emailQueue.add(
            "send-email",
            {
                emailId: email.id,
                senderId: sender.id,
                recipients: uniqueRecipients,
                subject,
                body,
                scheduledAt
            },
            {
                jobId: email.id,
                delay,
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000
                }
            }
        );

        // Index email in Elasticsearch
        try {
            await indexEmail({
                id: email.id,
                subject: email.subject,
                body: email.body,
                sender: sender.email,
                recipients: uniqueRecipients,
                status: email.status,
                scheduledAt: email.scheduledAt,
                createdAt: email.createdAt
            });
        } catch (elasticError) {
            console.error("Elasticsearch indexing failed:", elasticError);
        }

        return res.status(201).json({
            success: true,
            message: "Email saved and scheduled successfully!",
            emailId: email.id,
            jobId: job.id,
            sender: sender.email,
            senderId: sender.id,
            recipients: uniqueRecipients,
            recipientCount: uniqueRecipients.length,
            scheduledAt,
            delayInSeconds: Math.ceil(delay / 1000)
        });

    } catch (error) {
        console.error("Scheduling error:", error);

        if (emailId) {
            try {
                await prisma.email.update({
                    where: { id: emailId },
                    data: { status: "QUEUE_FAILED" }
                });
            } catch (dbError) {
                console.error("Database update error:", dbError);
            }
        }

        return res.status(500).json({
            success: false,
            message: "Failed to schedule email"
        });
    }
});

export default router;




