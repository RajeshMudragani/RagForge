import { Worker, Job } from "bullmq";
import { bullMQConnection } from "../../../config/bullmq.config.js";
import { env } from "../../../config/env.config.js";
import { logger } from "../../../logger/logger.js";
import { EvaluationService } from "../../evaluation/evaluation.service.js";
import { ChatService } from "../../chat/chat.service.js";
import { PromptType } from "../../chat/chat.constants.js";
import { EvaluationJobData } from "../interfaces/evaluation-job.interface.js";
import { QUEUES } from "../queue/queue.constants.js";
import { evaluationJobsTotal } from "../../metrics/metrics.registry.js";

const evaluationService = new EvaluationService();
const chatService = new ChatService();

async function processEvaluationJob(job: Job<EvaluationJobData>): Promise<void> {

    const { tenantId, question, expectedAnswer, topK, generatedAnswer: providedAnswer } = job.data;

    const startedAt = Date.now();

    try {
        await job.updateProgress(10);

        // If the answer was already generated (auto-triggered from chat), use it.
        // Otherwise generate it now (manual evaluation path).
        const generatedAnswer = providedAnswer ??
            (await chatService.chat(question, topK, PromptType.DEFAULT, tenantId)).answer;

        const result = await evaluationService.processEvaluation(
            question,
            generatedAnswer,
            topK,
            tenantId,
            expectedAnswer,
        );

        await job.updateProgress(100);
        evaluationJobsTotal.inc();

        logger.info(
            { jobId: job.id, tenantId, overallScore: result.overallScore, processingTimeMs: Date.now() - startedAt },
            "Evaluation job completed",
        );

    } catch (error) {
        logger.error({ jobId: job.id, tenantId, question, err: error }, "Evaluation job failed");
        throw error;
    }
}

let evaluationWorker: Worker<EvaluationJobData>;

export function createEvaluationWorker(): Worker<EvaluationJobData> {
    evaluationWorker = new Worker<EvaluationJobData>(
        QUEUES.EVALUATION,
        processEvaluationJob,
        {
            connection: bullMQConnection,
            concurrency: env.WORKER_CONCURRENCY,
            stalledInterval: 300_000,
            maxStalledCount: 0,
        },
    );

    evaluationWorker.on("completed", job => {
        logger.info({ jobId: job.id, jobName: job.name }, "Evaluation worker: job completed");
    });

    evaluationWorker.on("failed", (job, error) => {
        logger.error(
            { jobId: job?.id, jobName: job?.name, err: error, attemptsMade: job?.attemptsMade },
            "Evaluation worker: job failed",
        );
    });

    evaluationWorker.on("stalled", (jobId) => {
        logger.warn({ jobId }, "Evaluation worker: job stalled");
    });

    evaluationWorker.on("error", error => {
        logger.error({ err: error }, "Evaluation worker: worker error");
    });

    return evaluationWorker;
}

export async function closeEvaluationWorker(): Promise<void> {
    await evaluationWorker?.close();
}