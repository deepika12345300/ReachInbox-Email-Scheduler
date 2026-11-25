
import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function testSMTP() {
    try {
        await transporter.verify();
        console.log("SMTP connection successful!");
        console.log("Ethereal credentials are working.");
    } catch (error) {
        console.error("SMTP connection failed:", error);
    } finally {
        transporter.close();
    }
}

testSMTP();
