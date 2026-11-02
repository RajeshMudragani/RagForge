import { createClient } from "redis";
import { env } from "./env.config.js";
import { logger } from "../logger/logger.js";

export const redis = createClient({
    socket: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
    },
    password: env.REDIS_PASSWORD || undefined,
    database: env.REDIS_DB,
});

redis.on(
    "connect",
    () => {
        logger.info("Redis connected successfully");
    },
);

redis.on(
    "reconnecting",
    () => {
        logger.warn("Redis reconnecting...");
    },
);

redis.on(
    "end",
    () => {
        logger.warn("Redis connection closed");
    },
);

redis.on(
    "error",
    error => {
        logger.error({ err: error }, "Redis Error");
    },
);
