import { redis } from "../../config/redis.config.js";

export class CacheService {

    async get<T>(
        key: string,
    ): Promise<T | null> {

        const value = await redis.get(key);

        if (!value) {
            return null;
        }

        return JSON.parse(
            value,
        );
    }

    async set(
        key: string,
        value: unknown,
        ttlSeconds: number,
    ) {

        await redis.set(
            key,
            JSON.stringify(
                value,
            ),
            {
                EX: ttlSeconds,
            },
        );
    }

    async del(
        key: string,
    ) {
        await redis.del(key);
    }
}