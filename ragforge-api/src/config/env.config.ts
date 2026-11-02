import "dotenv/config";
import { z } from "zod";
import { logger } from "../logger/logger.js";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]),

    PORT: z.coerce.number().int().positive(),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]),

    DATABASE_URL: z.string().min(1),
    DB_POOL_MAX: z.coerce.number().int().positive().default(20),
    DB_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),

    OLLAMA_BASE_URL: z.string().url(),
    OLLAMA_LLM_MODEL: z.string().min(1),
    OLLAMA_EMBED_MODEL: z.string().min(1),
    EMBEDDING_DIMENSIONS: z.coerce.number().int().positive(),

    MINIO_ENDPOINT: z.string(),
    MINIO_PORT: z.coerce.number(),
    MINIO_ACCESS_KEY: z.string(),
    MINIO_SECRET_KEY: z.string(),
    MINIO_BUCKET: z.string(),
    MINIO_USE_SSL: z.enum(["true", "false"]).transform((value) => value === "true"),
    MINIO_REGION: z.string().default("us-east-1"),

    API_PREFIX: z.string().default("/api/v1"),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    REQUEST_BODY_LIMIT: z.string().default("50mb"),
    UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(100),

    JWT_ACCESS_EXPIRES_IN: z.enum(["15m", "30m", "1h", "12h"]),
    JWT_REFRESH_EXPIRES_IN: z.enum(["7d", "30d"]),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    CHAT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
    EVALUATION_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600000),
    CHAT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600000),
    EVALUATION_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600000),
    UPLOAD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600000),

    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
    REDIS_PASSWORD: z.string().default(""),
    REDIS_DB: z.coerce.number().default(0),

    CACHE_DEFAULT_TTL_SECONDS: z.coerce.number().positive().default(300),
    CACHE_AUTH_KEY_TTL_SECONDS: z.coerce.number().positive().default(3600),
    CACHE_COLLECTION_TTL_SECONDS: z.coerce.number().positive().default(900),
    CACHE_RETRIEVAL_TTL_SECONDS: z.coerce.number().positive().default(300),

    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
    JOB_ATTEMPTS: z.coerce.number().int().positive().default(3),
    JOB_BACKOFF_DELAY_MS: z.coerce.number().int().positive().default(5000),
    CONTEXTUAL_ENRICHMENT_ENABLED: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
    CONTEXTUAL_ENRICHMENT_CONCURRENCY: z.coerce.number().int().positive().default(3),

    GEMINI_MODEL: z.string().min(1),
    GEMINI_API_KEY: z.string().min(1),
    LLM_PROVIDER: z.enum(["ollama", "gemini", "openrouter"]).default("ollama"),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default("google/gemma-4-31b-it:free"),
});


const result = envSchema.safeParse(process.env);

if (!result.success) {
    logger.error("Environment validation failed");

    for (const issue of result.error.issues) {
        logger.error(`${issue.path.join(".")}: ${issue.message}`);
    }

    logger.error("Server startup aborted.");

    process.exit(1);
}

export const env = result.data;
