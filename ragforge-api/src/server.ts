import app from "./app.js";
import { env } from "./config/env.config.js";
import { logger } from "./logger/logger.js";
import { checkDatabaseConnection, pool } from "./config/db.config.js";
import { redis } from "./config/redis.config.js";
import { startWorkers, closeWorkers } from "./modules/jobs/workers/index.js";

const startServer = async () => {
    try {
        await checkDatabaseConnection();

        await redis.connect();

        await startWorkers();

        const server = app.listen(env.PORT, () => {
            logger.info(`Server is running on port ${env.PORT}`);
        });

        let isShuttingDown = false;

        const shutdown = async (signal: string) => {
            if (isShuttingDown) {
                logger.warn("Shutdown already in progress");
                return;
            }

            isShuttingDown = true;

            logger.info(`${signal} received. Starting graceful shutdown...`);

            const forceShutdownTimer = setTimeout(() => {
                logger.error("Graceful shutdown timeout exceeded. Forcing shutdown.");
                server.closeAllConnections();
                process.exit(1);
            }, env.SHUTDOWN_TIMEOUT_MS);

            server.close(async (error) => {
                clearTimeout(forceShutdownTimer);

                if (error) {
                    logger.error({ err: error }, "Error while closing HTTP server");
                } else {
                    logger.warn("HTTP server closed");
                }

                try {
                    await closeWorkers();

                    if (redis.isOpen) {
                        await redis.quit();
                    }

                    await pool.end();

                    logger.warn("PostgreSQL connection pool closed");
                    process.exit(error ? 1 : 0);
                } catch (error) {
                    logger.error({ err: error }, "Error closing PostgreSQL connection pool");
                    process.exit(1);
                }
            });
        };

        process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
        process.once("SIGINT", () => { void shutdown("SIGINT"); });
    } catch (error) {
        logger.error({ err: error }, "Failed to start application");
        await pool.end();
        process.exit(1);
    }
};

void startServer();