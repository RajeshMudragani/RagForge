import { Worker, Job, UnrecoverableError } from "bullmq";
import { bullMQConnection } from "../../../config/bullmq.config.js";
import { env } from "../../../config/env.config.js";
import { logger } from "../../../logger/logger.js";
import { IngestionService } from "../../ingestion/ingestion.service.js";
import { DocumentJobData } from "../interfaces/document-job.interface.js";
import { QUEUES } from "../queue/queue.constants.js";
import { DOCUMENT_JOBS } from "../jobs/document.job.js";
import { documentJobsTotal } from "../../metrics/metrics.registry.js";
import { NotFoundError } from "../../../common/errors/index.js";
import { documentSummaryQueue } from "../queue/document-summary.queue.js";
import { DOCUMENT_SUMMARY_JOBS } from "../jobs/document-summary.job.js";


const ingestionService = new IngestionService();

async function processDocumentJob(job: Job<DocumentJobData>) {

    await job.updateProgress(10);

    await ingestionService.process(
        job.data.documentId,
    ).catch((err) => {

        if (
            err instanceof NotFoundError
        ) {
            throw new UnrecoverableError(
                err.message,
            );
        }

        throw err;
    });

    await documentSummaryQueue.add(
        DOCUMENT_SUMMARY_JOBS.GENERATE_DOCUMENT_SUMMARY, {
            documentId: job.data.documentId,
        },
    );

    await job.updateProgress(100);
}


let documentWorker: Worker<DocumentJobData>;

export function createDocumentWorker(): Worker<DocumentJobData> {
    documentWorker = new Worker<DocumentJobData>(
        QUEUES.DOCUMENT,
        processDocumentJob,
        {
            connection: bullMQConnection,
            concurrency: env.WORKER_CONCURRENCY,
            lockDuration: 30 * 60 * 1000,  // 30 min — Ollama can be very slow on large PDFs
            stalledInterval: 5 * 60 * 1000, // check every 5 min, not 60s
            maxStalledCount: 0,
            limiter: { max: 10, duration: 1000 },
        },
    );

    documentWorker.on("completed", (job) => {
        logger.info({ jobId: job.id, jobName: job.name }, "Document worker: job completed");
    });

    documentWorker.on("failed", (job, error) => {
        logger.error(
            { jobId: job?.id, jobName: job?.name, err: error, attemptsMade: job?.attemptsMade },
            "Document worker: job failed",
        );
    });

    documentWorker.on("stalled", (jobId) => {
        logger.warn({ jobId }, "Document worker: job stalled");
    });

    documentWorker.on("error", (error) => {
        logger.error({ err: error }, "Document worker: worker error");
    });

    // @ts-ignore — lockRenewalFailed is a valid BullMQ event but not in all type versions
    documentWorker.on("lockRenewalFailed", (jobIds: string[]) => {
        logger.error({ jobIds }, "Document worker: lock renewal failed — job may stall");
    });

    return documentWorker;
}

export async function closeDocumentWorker(): Promise<void> {
    await documentWorker?.close();
}
