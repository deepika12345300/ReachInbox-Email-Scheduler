
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

interface SMTPConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
}

const smtpConfigs: Record<string, SMTPConfig> = {
    "sender@reachinbox.local": {
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
        from: process.env.SMTP_FROM || ""
    },

    "sender2@reachinbox.local": {
        host: process.env.SMTP2_HOST || "smtp.ethereal.email",
        port: Number(process.env.SMTP2_PORT || 587),
        secure: false,
        user: process.env.SMTP2_USER || "",
        pass: process.env.SMTP2_PASS || "",
        from: process.env.SMTP2_FROM || ""
    }
};

function getTransporter(senderEmail: string) {
    const config = smtpConfigs[senderEmail.toLowerCase()];

    if (!config) {
        throw new Error(
            `SMTP configuration not found for sender: ${senderEmail}`
        );
    }

    if (!config.user || !config.pass || !config.from) {
        throw new Error(
            `SMTP credentials missing for sender: ${senderEmail}`
        );
    }

    return {
        transporter: nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass
            }
        }),
        from: config.from
    };
}

export async function sendEmail(
    to: string,
    subject: string,
    body: string,
    senderEmail: string
) {
    const { transporter, from } = getTransporter(senderEmail);

    try {
        const info = await transporter.sendMail({
            from,
            to,
            subject,
            text: body
        });

        console.log("Email sent:", info.messageId);
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));

        return info;
    } finally {
        transporter.close();
    }
}


