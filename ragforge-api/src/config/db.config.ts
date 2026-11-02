import { Pool } from "pg";
import { env } from "./env.config.js";
import { logger } from "../logger/logger.js";
import { drizzle } from "drizzle-orm/node-postgres";

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    min: env.DB_POOL_MIN,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
});

export const checkDatabaseConnection = async (): Promise<void> => {
    const client = await pool.connect();

    try {
        await client.query("SELECT 1");
        logger.info("Database connected successfully");
    } finally {
        client.release();
    }
};

export const db = drizzle(pool, {
    logger: false,
});