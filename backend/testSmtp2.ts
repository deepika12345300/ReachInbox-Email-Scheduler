
import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP2_HOST,
    port: Number(process.env.SMTP2_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP2_USER,
        pass: process.env.SMTP2_PASS
    }
});

async function testSMTP2() {
    try {
        await transporter.verify();

        console.log("Second SMTP connection successful!");
        console.log("Second Ethereal account is working.");
    } catch (error) {
        console.error("Second SMTP connection failed:", error);
    } finally {
        transporter.close();
    }
}

testSMTP2();
