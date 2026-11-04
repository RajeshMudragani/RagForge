import "dotenv/config";
import { z } from "zod";
import { logger } from "../logger/logger.js";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]),

    PORT: z.coerce.number().int().positive(),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]),

    DATABASE_URL: z.string().url(),
    DB_POOL_MAX: z.coerce.number().int().positive().default(20),
    DB_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),

    OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
    OLLAMA_LLM_MODEL: z.string().default("llama3.2"),
    EMBEDDING_DIMENSIONS: z.coerce.number().int().positive(),

    STORAGE_PROVIDER: z.preprocess(
        (value) => process.env.NODE_ENV === "production" ? "r2" : value,
        z.enum(["minio", "r2"]).default("minio"),
    ),

    MINIO_ENDPOINT: z.string().optional(),
    MINIO_PORT: z.coerce.number().int().positive().optional(),
    MINIO_ACCESS_KEY: z.string().optional(),
    MINIO_SECRET_KEY: z.string().optional(),
    MINIO_BUCKET: z.string().optional(),
    MINIO_USE_SSL: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
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

    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
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

    GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
    GEMINI_API_KEY: z.string().optional(),
    LLM_PROVIDER: z.preprocess(
        (value) => process.env.NODE_ENV === "production" ? "openrouter" : value,
        z.enum(["ollama", "gemini", "openrouter"]).default("openrouter"),
    ),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default("google/gemma-4-31b-it:free"),
    OPENROUTER_EMBEDDING_MODEL: z.string().default("openai/text-embedding-3-small"),

    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_ENDPOINT: z.string().optional(),

}).superRefine((config, context) => {
    const storageProvider = config.NODE_ENV === "production"
        ? "r2"
        : config.STORAGE_PROVIDER;

    const requiredKeys = storageProvider === "r2"
        ? [
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
            "R2_BUCKET_NAME",
            "R2_ENDPOINT",
        ] as const
        : [
            "MINIO_ENDPOINT",
            "MINIO_PORT",
            "MINIO_ACCESS_KEY",
            "MINIO_SECRET_KEY",
            "MINIO_BUCKET",
            "MINIO_USE_SSL",
        ] as const;

    for (const key of requiredKeys) {
        const value = config[key];
        if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
            context.addIssue({
                code: "custom",
                path: [key],
                message: `Required when STORAGE_PROVIDER is ${storageProvider}`,
            });
        }
    }

    if (
        storageProvider === "r2" &&
        config.R2_ENDPOINT &&
        (!z.string().url().safeParse(config.R2_ENDPOINT).success ||
            !config.R2_ENDPOINT.startsWith("https://"))
    ) {
        context.addIssue({
            code: "custom",
            path: ["R2_ENDPOINT"],
            message: "Must be a valid HTTPS R2 endpoint",
        });
    }

    if (config.REDIS_URL) {
        const redisUrl = z.string().url().safeParse(config.REDIS_URL);
        if (redisUrl.success && !["redis:", "rediss:"].includes(new URL(redisUrl.data).protocol)) {
            context.addIssue({
                code: "custom",
                path: ["REDIS_URL"],
                message: "Must use the redis:// or rediss:// protocol",
            });
        }
    }

    if (config.NODE_ENV === "production") {
        if (storageProvider !== config.STORAGE_PROVIDER) {
            context.addIssue({
                code: "custom",
                path: ["STORAGE_PROVIDER"],
                message: "Production deployments must use R2",
            });
        }

        if (!config.REDIS_URL?.startsWith("rediss://")) {
            context.addIssue({
                code: "custom",
                path: ["REDIS_URL"],
                message: "Production deployments must use a TLS Redis URL (rediss://), such as Upstash",
            });
        }

        if (config.LLM_PROVIDER !== "openrouter") {
            context.addIssue({
                code: "custom",
                path: ["LLM_PROVIDER"],
                message: "Production deployments must use OpenRouter",
            });
        }

        const databaseUrl = z.string().url().safeParse(config.DATABASE_URL);
        if (databaseUrl.success) {
            const parsedDatabaseUrl = new URL(databaseUrl.data);
            if (!["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) {
                context.addIssue({
                    code: "custom",
                    path: ["DATABASE_URL"],
                    message: "Production deployments must use a PostgreSQL connection URL",
                });
            } else if (["localhost", "127.0.0.1", "::1"].includes(parsedDatabaseUrl.hostname)) {
                context.addIssue({
                    code: "custom",
                    path: ["DATABASE_URL"],
                    message: "Production deployments must use a hosted PostgreSQL database",
                });
            }
        }
    }

    if (config.LLM_PROVIDER === "openrouter" && !config.OPENROUTER_API_KEY?.trim()) {
        context.addIssue({
            code: "custom",
            path: ["OPENROUTER_API_KEY"],
            message: "Required when LLM_PROVIDER is openrouter",
        });
    }

    if (config.LLM_PROVIDER === "gemini" && !config.GEMINI_API_KEY?.trim()) {
        context.addIssue({
            code: "custom",
            path: ["GEMINI_API_KEY"],
            message: "Required when LLM_PROVIDER is gemini",
        });
    }

    if (
        config.LLM_PROVIDER === "ollama" &&
        (!config.OLLAMA_BASE_URL || !config.OLLAMA_LLM_MODEL?.trim())
    ) {
        context.addIssue({
            code: "custom",
            path: ["OLLAMA_BASE_URL"],
            message: "OLLAMA_BASE_URL and OLLAMA_LLM_MODEL are required when LLM_PROVIDER is ollama",
        });
    }
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
