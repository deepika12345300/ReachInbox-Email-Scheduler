
import Redis from "ioredis";

const redisConnection = new Redis(
    process.env.REDIS_URL || "redis://127.0.0.1:6379",
    {
        maxRetriesPerRequest: null
    }
);

redisConnection.on("connect", () => {
    console.log("Redis connected successfully!");
});

redisConnection.on("error", (error) => {
    console.error("Redis connection error:", error);
});

export default redisConnection;
