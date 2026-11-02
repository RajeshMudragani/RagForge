import { Redis } from "ioredis";
import { env } from "./env.config.js";

export const bullMQConnection = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // required by BullMQ
});
