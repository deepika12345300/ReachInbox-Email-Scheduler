
import "dotenv/config";
import { checkEmailRateLimit } from "./src/services/rateLimiter.js";

async function test() {
    const senderId = "rate-limit-test-2";

    for (let i = 1; i <= 3; i++) {
        const result = await checkEmailRateLimit(senderId);

        console.log(`Attempt ${i}:`, result);
    }

    process.exit(0);
}

test();

