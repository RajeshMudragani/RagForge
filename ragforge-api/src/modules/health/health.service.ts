import { db } from "../../config/db.config.js";
import { redis } from "../../config/redis.config.js";
import { MinioService } from "../../storage/minio/minio.service.js";
import { OllamaService } from "../llm/ollama.provider.js";
import {
    documentQueue,
    evaluationQueue,
    notificationQueue,
} from "../jobs/queue/queue.config.js";

export class HealthService {

    private readonly minioService = new MinioService();
    private readonly ollamaService = new OllamaService();

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

    async checkMinio() {

        const startedAt = Date.now();

        try {

            await this.minioService.healthCheck();

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
                        : "MinIO check failed",
            };
        }
    }

    async checkOllama() {

        const startedAt = Date.now();

        try {

            await this.ollamaService.healthCheck();

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
                        : "Ollama check failed",
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
            minio,
            ollama,
            bullmq,
        ] = await Promise.all([
            this.checkDatabase(),
            this.checkRedis(),
            this.checkMinio(),
            this.checkOllama(),
            this.checkBullMQ(),
        ]);

        const overallStatus =
            [
                database,
                redis,
                minio,
                ollama,
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
                minio,
                ollama,
                bullmq,
            },
        };
    }
}
