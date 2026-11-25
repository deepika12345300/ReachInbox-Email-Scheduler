
import { Router } from "express";
import elasticClient from "../config/elasticsearch.js";

const router = Router();

router.get("/emails/search", async (req, res) => {
    try {
        const query = req.query.q;

        if (!query || typeof query !== "string" || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide a search query using ?q="
            });
        }

        const result = await elasticClient.search({
            index: "emails",
            query: {
                multi_match: {
                    query: query.trim(),
                    fields: [
                        "subject^3",
                        "body",
                        "recipients"
                    ],
                    fuzziness: "AUTO"
                }
            }
        });

        const emails = result.hits.hits.map(hit => {
    const source = hit._source as {
        emailId: string;
        subject: string;
        body: string;
        sender: string;
        recipients: string[];
        status: string;
        scheduledAt: string;
        createdAt: string;
    } | undefined;

    return {
        id: hit._id,
        ...source
    };
});

        return res.status(200).json({
            success: true,
            count: emails.length,
            emails
        });

    } catch (error) {
        console.error("Email search error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to search emails"
        });
    }
});

export default router;
