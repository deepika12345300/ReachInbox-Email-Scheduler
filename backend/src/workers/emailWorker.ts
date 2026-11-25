
import { Worker, DelayedError } from "bullmq";
import { checkEmailRateLimit } from "../services/rateLimiter.js";
import redisConnection from "../config/redis.js";
import { sendEmail } from "../services/emailService.js";
import prisma from "../config/database.js";
import { sendSlackNotification } from "../services/slackService.js";
import elasticClient from "../config/elasticsearch.js";

const MIN_DELAY = Number(
    process.env.MIN_DELAY_BETWEEN_EMAILS || 2000
);

const sleep = (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms));

const emailWorker = new Worker(
    "email-queue",
    async (job, token) => {

        console.log("Processing email job:", job.id);

        const {
            emailId,
            senderId,
            recipients: recipientList,
            to,
            subject,
            body
        } = job.data;

        if (!senderId) {
            throw new Error("Sender ID is missing");
        }

        // Fetch selected sender from PostgreSQL
        const sender = await prisma.sender.findUnique({
            where: {
                id: senderId
            }
        });

        if (!sender) {
            throw new Error("Selected sender not found");
        }

        const senderEmail = sender.email;

        console.log("Selected sender:", senderEmail);

        const recipients: string[] = Array.isArray(recipientList)
            ? recipientList
            : [to];

        for (let i = 0; i < recipients.length; i++) {

            const recipient = recipients[i];

            const existingRecipient =
                await prisma.emailRecipient.findFirst({
                    where: {
                        emailId,
                        address: recipient
                    }
                });

            if (existingRecipient?.status === "SENT") {
                console.log("Already sent, skipping:", recipient);
                continue;
            }

            const rateLimit = await checkEmailRateLimit(senderId);

            console.log("Rate limit status:", rateLimit);

            if (!rateLimit.allowed) {

                console.log("Hourly email limit reached!");

                try {
                    await sendSlackNotification(
                        senderId,
                        rateLimit.retryAfterSeconds
                    );
                } catch (error) {
                    console.error(
                        "Slack notification failed:",
                        error
                    );
                }

                const nextAttemptAt =
                    Date.now() + rateLimit.retryAfterSeconds * 1000;

                console.log(
                    `Delaying job for ${rateLimit.retryAfterSeconds} seconds`
                );

                if (!token) {
                    throw new Error("Worker lock token is missing");
                }

                await job.moveToDelayed(nextAttemptAt, token);

                throw new DelayedError();
            }

            // Send using selected sender's SMTP configuration
            const info = await sendEmail(
                recipient,
                subject,
                body,
                senderEmail
            );

            console.log("Email sent to:", recipient);
            console.log("Message ID:", info.messageId);

            await prisma.emailRecipient.updateMany({
                where: {
                    emailId,
                    address: recipient
                },
                data: {
                    status: "SENT"
                }
            });

            if (i < recipients.length - 1) {
                console.log(`Waiting ${MIN_DELAY}ms...`);
                await sleep(MIN_DELAY);
            }
        }

        // Update PostgreSQL
        await prisma.email.update({
            where: {
                id: emailId
            },
            data: {
                status: "SENT",
                sentAt: new Date()
            }
        });

        console.log("PostgreSQL email status updated to SENT!");

        // Update Elasticsearch
        try {
            await elasticClient.update({
                index: "emails",
                id: emailId,
                doc: {
                    status: "SENT",
                    sentAt: new Date()
                },
                refresh: true
            });

            console.log("Elasticsearch email status updated to SENT!");
        } catch (error) {
            console.error(
                "Elasticsearch status update failed:",
                error
            );
        }

        console.log("All recipient statuses updated!");

        return {
            success: true,
            recipientCount: recipients.length
        };
    },
    {
        connection: redisConnection,
        concurrency: Number(
            process.env.WORKER_CONCURRENCY || 5
        )
    }
);

emailWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
});

console.log("Email worker started!");







