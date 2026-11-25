

import redisConnection from "../config/redis.js";

const RATE_LIMIT_SCRIPT = `
    local time = redis.call('TIME')
    local now = tonumber(time[1])
    local hourBucket = math.floor(now / 3600)

    local key = KEYS[1] .. ':' .. hourBucket
    local count = tonumber(redis.call('GET', key) or '0')
    local limit = tonumber(ARGV[1])

    if count < limit then
        local newCount = redis.call('INCR', key)
        redis.call('EXPIRE', key, 7200)

        return {1, 0, newCount}
    end

    local retryAfter = 3600 - (now % 3600)

    return {0, retryAfter, count}
`;

const SETTINGS_KEY = "settings:emails-per-hour-limit";

export async function getEmailRateLimit() {
    const savedLimit = await redisConnection.get(SETTINGS_KEY);

    return Number(
        savedLimit || process.env.EMAILS_PER_HOUR_LIMIT || 100
    );
}

export async function updateEmailRateLimit(limit: number) {
    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Hourly limit must be a positive integer");
    }

    await redisConnection.set(SETTINGS_KEY, String(limit));

    return limit;
}

export async function checkEmailRateLimit(senderId: string) {
    const limit = await getEmailRateLimit();

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("Invalid email rate limit configuration");
    }

    const result = await redisConnection.eval(
        RATE_LIMIT_SCRIPT,
        1,
        `email-rate-limit:${senderId}`,
        String(limit)
    ) as number[];

    return {
        allowed: Number(result[0]) === 1,
        retryAfterSeconds: Number(result[1]),
        currentCount: Number(result[2])
    };
}
