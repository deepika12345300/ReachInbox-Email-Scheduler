
import "dotenv/config";
import { createEmailIndex } from "./src/services/elasticsearchService.js";

async function main() {
    try {
        await createEmailIndex();
        console.log("Index setup completed!");
    } catch (error) {
        console.error("Index creation failed:", error);
    }
}

main();
