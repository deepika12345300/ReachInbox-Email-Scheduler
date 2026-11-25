
import prisma from "../config/database.js";
import redisConnection from "../config/redis.js";

export async function sendSlackNotification(
    senderId: string,
    retryAfterSeconds: number
) {
    const channel = process.env.SLACK_CHANNEL_ID;

    if (!channel) {
        throw new Error("SLACK_CHANNEL_ID is missing");
    }

    // Find Slack connection of sender's user
    const sender = await prisma.sender.findUnique({
        where: { id: senderId },
        include: {
            user: {
                include: {
                    slackConnections: true
                }
            }
        }
    });

    const connection = sender?.user.slackConnections[0];

    if (!connection) {
        console.log("No Slack workspace connected.");
        return;
    }

    // Prevent duplicate notifications for the same sender/hour
    const time = await redisConnection.time();
    const hourBucket = Math.floor(Number(time[0]) / 3600);

    const notificationKey =
        `slack-rate-limit-notified:${senderId}:${hourBucket}`;

    const lock = await redisConnection.set(
        notificationKey,
        "1",
        "EX",
        7200,
        "NX"
    );

    if (lock !== "OK") {
        console.log("Slack notification already sent for this hour.");
        return;
    }

    try {
        const response = await fetch(
            "https://slack.com/api/chat.postMessage",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${connection.accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    channel,
                    text:
                        `⚠️ Email hourly limit reached!\n` +
                        `Sender ID: ${senderId}\n` +
                        `Emails will resume after approximately ${Math.ceil(retryAfterSeconds / 60)} minutes.`
                })
            }
        );

        const result = await response.json() as {
            ok: boolean;
            error?: string;
        };

        if (!result.ok) {
            throw new Error(result.error || "Slack notification failed");
        }

        console.log("Slack notification sent successfully!");

    } catch (error) {
        await redisConnection.del(notificationKey);
        throw error;
    }
}
