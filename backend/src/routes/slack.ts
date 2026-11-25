
import { Router } from "express";
import { randomBytes } from "crypto";
import prisma from "../config/database.js";
import redisConnection from "../config/redis.js";

const router = Router();

// Step 1: Start Slack OAuth
router.get("/connect", async (req, res) => {
    try {
        const state = randomBytes(32).toString("hex");

        // Store OAuth state for 10 minutes
        await redisConnection.set(
            `slack-oauth-state:${state}`,
            "demo@reachinbox.local",
            "EX",
            600
        );

        const clientId = process.env.SLACK_CLIENT_ID;
        const redirectUri = process.env.SLACK_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return res.status(500).json({
                success: false,
                message: "Slack OAuth environment variables are missing"
            });
        }

        const slackUrl = new URL(
            "https://slack.com/oauth/v2/authorize"
        );

        slackUrl.searchParams.set("client_id", clientId);
        slackUrl.searchParams.set("scope", "chat:write");
        slackUrl.searchParams.set("redirect_uri", redirectUri);
        slackUrl.searchParams.set("state", state);

        return res.redirect(slackUrl.toString());

    } catch (error) {
        console.error("Slack connect error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to start Slack connection"
        });
    }
});

// Step 2: Slack OAuth callback
router.get("/callback", async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.status(400).send("Slack authorization was cancelled.");
        }

        if (
            typeof code !== "string" ||
            typeof state !== "string"
        ) {
            return res.status(400).send("Invalid Slack callback.");
        }

        const stateKey = `slack-oauth-state:${state}`;
        const userEmail = await redisConnection.get(stateKey);

        if (!userEmail) {
            return res.status(400).send("Invalid or expired OAuth state.");
        }

        await redisConnection.del(stateKey);

        const response = await fetch(
            "https://slack.com/api/oauth.v2.access",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    client_id: process.env.SLACK_CLIENT_ID || "",
                    client_secret: process.env.SLACK_CLIENT_SECRET || "",
                    code,
                    redirect_uri: process.env.SLACK_REDIRECT_URI || ""
                })
            }
        );

        const slackData = await response.json() as {
            ok: boolean;
            error?: string;
            access_token?: string;
            team?: { id?: string; name?: string };
            bot_user_id?: string;
            scope?: string;
        };

        if (
            !slackData.ok ||
            !slackData.access_token ||
            !slackData.team?.id
        ) {
            console.error("Slack OAuth response:", slackData.error);

            return res.status(400).send(
                `Slack connection failed: ${slackData.error || "Unknown error"}`
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: userEmail }
        });

        if (!user) {
            return res.status(404).send("Application user not found.");
        }

        await prisma.slackConnection.upsert({
            where: {
                userId_teamId: {
                    userId: user.id,
                    teamId: slackData.team.id
                }
            },
            update: {
                teamName: slackData.team.name,
                botUserId: slackData.bot_user_id,
                accessToken: slackData.access_token,
                scope: slackData.scope
            },
            create: {
                userId: user.id,
                teamId: slackData.team.id,
                teamName: slackData.team.name,
                botUserId: slackData.bot_user_id,
                accessToken: slackData.access_token,
                scope: slackData.scope
            }
        });

        return res.send(
            "Slack connected successfully! You can close this page."
        );

    } catch (error) {
        console.error("Slack callback error:", error);

        return res.status(500).send("Slack connection failed.");
    }
});

// Step 3: Disconnect Slack
router.delete("/disconnect", async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: "demo@reachinbox.local" }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const result = await prisma.slackConnection.deleteMany({
            where: { userId: user.id }
        });

        return res.json({
            success: true,
            message: "Slack disconnected successfully!",
            disconnectedConnections: result.count
        });

    } catch (error) {
        console.error("Slack disconnect error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to disconnect Slack"
        });
    }
});

export default router;
