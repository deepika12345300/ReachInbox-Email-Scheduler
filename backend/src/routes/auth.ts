
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import prisma from "../config/database.js";

const router = Router();

router.post("/auth/google", async (req, res) => {
    try {
        const { credential } = req.body;
        const clientId = process.env.GOOGLE_CLIENT_ID;

        if (!clientId) {
            res.status(500).json({
                success: false,
                message: "Google Client ID is not configured"
            });
            return;
        }

        if (!credential) {
            res.status(400).json({
                success: false,
                message: "Google credential is required"
            });
            return;
        }

        const googleClient = new OAuth2Client(clientId);

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: clientId
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email || !payload.sub || !payload.email_verified) {
            res.status(401).json({
                success: false,
                message: "Invalid or unverified Google account"
            });
            return;
        }

        const user = await prisma.user.upsert({
            where: { email: payload.email },
            update: {
                googleId: payload.sub,
                name: payload.name || undefined
            },
            create: {
                email: payload.email,
                googleId: payload.sub,
                name: payload.name || null
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        res.status(200).json({
            success: true,
            message: "Google login successful",
            user
        });

    } catch (error) {
        console.error("Google authentication error:", error);

        res.status(401).json({
            success: false,
            message: "Google authentication failed"
        });
    }
});

export default router;

