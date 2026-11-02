import { Request, Response } from "express";
import { db } from "../../config/db.config.js";
import { redis } from "../../config/redis.config.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";
import { MinioService } from "../../storage/minio/minio.service.js";
import { OllamaService } from "../llm/ollama.provider.js";
import {
    documentQueue,
    evaluationQueue,
    notificationQueue,
} from "../jobs/queue/queue.config.js";

export class HealthController {

    private readonly minioService = new MinioService();
    private readonly ollamaService = new OllamaService();

    live = (
        _req: Request,
        res: Response,
    ): void => {

        res
            .status(
                HTTP_STATUS.OK,
            )
            .json({
                status: "UP",
                timestamp: new Date().toISOString(),
            });
    };

    ready = async (
        _req: Request,
        res: Response,
    ): Promise<void> => {

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

        const overallStatus = [
            database,
            redis,
            minio,
            ollama,
            bullmq,
        ].every(
            service => service.status === "UP",
        ) ? "UP" : "DOWN";

        res.status( overallStatus === "UP" ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE).json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            services: {
                database,
                redis,
                minio,
                ollama,
                bullmq,
            },
        });
};

    private async checkDatabase() {

        const startedAt = Date.now();

        try {

            await db.execute(
                "SELECT 1",
            );

            return {
                status: "UP",
                latencyMs: Date.now() - startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message: error instanceof Error ? error.message : "Database unavailable",
            };
        }
    }

    private async checkRedis() {

        const startedAt = Date.now();

        try {

            const pong = await redis.ping();

            return {
                status: pong === "PONG" ? "UP" : "DOWN",
                latencyMs: Date.now() - startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message: error instanceof Error ? error.message : "Redis unavailable",
            };
        }
    }

    private async checkMinio() {

        const startedAt = Date.now();

        try {

            await this.minioService.healthCheck();

            return {
                status: "UP",
                latencyMs: Date.now() - startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message: error instanceof Error ? error.message : "MinIO unavailable",
            };
        }
    }

    private async checkOllama() {

        const startedAt = Date.now();

        try {

            await this.ollamaService.healthCheck();

            return {
                status: "UP",
                latencyMs: Date.now() - startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message: error instanceof Error ? error.message : "Ollama unavailable",
            };
        }
    }

    private async checkBullMQ() {

        const startedAt = Date.now();

        try {

            await Promise.all([
                documentQueue.getJobCounts(),
                evaluationQueue.getJobCounts(),
                notificationQueue.getJobCounts(),
            ]);

            return {
                status: "UP",
                latencyMs: Date.now() - startedAt,
            };

        } catch (
            error
        ) {

            return {
                status: "DOWN",
                message: error instanceof Error ? error.message : "BullMQ unavailable",
            };
        }
    }
}