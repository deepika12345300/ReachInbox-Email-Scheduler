
import elasticClient from "../config/elasticsearch.js";

const INDEX_NAME = "emails";

export async function createEmailIndex() {
    const exists = await elasticClient.indices.exists({
        index: INDEX_NAME
    });

    if (!exists) {
        await elasticClient.indices.create({
            index: INDEX_NAME,
            mappings: {
                properties: {
                    emailId: { type: "keyword" },
                    subject: { type: "text" },
                    body: { type: "text" },
                    sender: { type: "keyword" },
                    recipients: { type: "keyword" },
                    status: { type: "keyword" },
                    scheduledAt: { type: "date" },
                    createdAt: { type: "date" }
                }
            }
        });

        console.log("Email index created successfully!");
    } else {
        console.log("Email index already exists!");
    }
}

export async function indexEmail(email: {
    id: string;
    subject: string;
    body: string;
    sender: string;
    recipients: string[];
    status: string;
    scheduledAt: Date;
    createdAt: Date;
}) {
    await elasticClient.index({
        index: INDEX_NAME,
        id: email.id,
        document: {
            emailId: email.id,
            subject: email.subject,
            body: email.body,
            sender: email.sender,
            recipients: email.recipients,
            status: email.status,
            scheduledAt: email.scheduledAt,
            createdAt: email.createdAt
        },
        refresh: true
    });

    console.log("Email indexed:", email.id);
}
