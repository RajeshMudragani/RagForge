import { Redis } from "ioredis";
import { env } from "./env.config.js";

export const bullMQConnection = env.REDIS_URL
    ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
    : new Redis({
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          password: env.REDIS_PASSWORD || undefined,
          db: env.REDIS_DB,
          maxRetriesPerRequest: null, // required by BullMQ
      });
