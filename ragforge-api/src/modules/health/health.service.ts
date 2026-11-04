import { db } from "../../config/db.config.js";
import { redis } from "../../config/redis.config.js";
import { StorageService } from "../../storage/storage.service.js";
import { LlmFactory } from "../llm/llm.factory.js";
import {
    documentQueue,
    evaluationQueue,
    notificationQueue,
} from "../jobs/queue/queue.config.js";

export class HealthService {

    private readonly storageService = new StorageService();
    private readonly llm = LlmFactory.create();

    async checkDatabase() {

        const startedAt = Date.now();

        try {

            await db.execute(
                "SELECT 1",
            );

            return {
                status: "UP",
                latencyMs:
                    Date.now() -
                    startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message:
                    error instanceof Error
                        ? error.message
                        : "Database check failed",
            };
        }
    }

    async checkRedis() {

        const startedAt = Date.now();

        try {

            const pong = await redis.ping();

            return {
                status:
                    pong === "PONG"
                        ? "UP"
                        : "DOWN",

                latencyMs:
                    Date.now() -
                    startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message:
                    error instanceof Error
                        ? error.message
                        : "Redis check failed",
            };
        }
    }

    async checkStorage() {

        const startedAt = Date.now();

        try {

            await this.storageService.healthCheck();

            return {
                status: "UP",
                latencyMs:
                    Date.now() -
                    startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message:
                    error instanceof Error
                        ? error.message
                        : "Object storage check failed",
            };
        }
    }

    async checkLlm() {

        const startedAt = Date.now();

        try {

            const available = await this.llm.healthCheck();
            if (!available) {
                return {
                    status: "DOWN",
                    message: "Configured LLM provider is unavailable",
                };
            }

            return {
                status: "UP",
                latencyMs:
                    Date.now() -
                    startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message:
                    error instanceof Error
                        ? error.message
                        : "LLM provider check failed",
            };
        }
    }

    async checkBullMQ() {

        const startedAt = Date.now();

        try {

            await Promise.all([
                documentQueue.getJobCounts(),
                evaluationQueue.getJobCounts(),
                notificationQueue.getJobCounts(),
            ]);

            return {
                status: "UP",
                latencyMs:
                    Date.now() -
                    startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message:
                    error instanceof Error
                        ? error.message
                        : "BullMQ check failed",
            };
        }
    }

    async readiness() {

        const [
            database,
            redis,
            storage,
            llm,
            bullmq,
        ] = await Promise.all([
            this.checkDatabase(),
            this.checkRedis(),
            this.checkStorage(),
            this.checkLlm(),
            this.checkBullMQ(),
        ]);

        const overallStatus =
            [
                database,
                redis,
                storage,
                llm,
                bullmq,
            ].every(
                service =>
                    service.status === "UP",
            )
                ? "UP"
                : "DOWN";

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            services: {
                database,
                redis,
                storage,
                llm,
                bullmq,
            },
        };
    }
}
