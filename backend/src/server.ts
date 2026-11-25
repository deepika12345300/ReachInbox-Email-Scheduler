
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/database.js";
import senderRouter from "./routes/sender.js";
import settingsRouter from "./routes/settings.js";
import authRouter from "./routes/auth.js";

import "./workers/emailWorker.js";

import testQueueRouter from "./routes/testQueue.js";
import scheduleEmailRouter from "./routes/scheduleEmail.js";
import slackRouter from "./routes/slack.js";
import bullBoardRouter from "./routes/bullBoard.js";
import emailListRouter from "./routes/emailList.js";
import emailSearchRouter from "./routes/emailSearch.js";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", testQueueRouter);
app.use("/api", scheduleEmailRouter);
app.use("/api/slack", slackRouter);
app.use("/admin/queues", bullBoardRouter);
app.use("/api", emailListRouter);
app.use("/api", emailSearchRouter);
app.use("/api", senderRouter);
app.use("/api", settingsRouter);
app.use("/api", authRouter);

// Home API
app.get("/", (_req, res) => {
    res.send("Welcome to ReachInbox Email Scheduler!");
});

// Health Check API
app.get("/api/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            success: true,
            message: "Backend and Database connected successfully!"
        });
    } catch (error) {
        console.error("Health check error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});


