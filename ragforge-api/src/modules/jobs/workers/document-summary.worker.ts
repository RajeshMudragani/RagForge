import { Worker, Job } from "bullmq";
import { bullMQConnection } from "../../../config/bullmq.config.js";
import { env } from "../../../config/env.config.js";
import { logger } from "../../../logger/logger.js";
import { QUEUES } from "../queue/queue.constants.js";
import { DocumentSummaryJobData } from "../interfaces/document-summary-job.interface.js";
import { DocumentSummaryService } from "../../document-summary/document-summary.service.js";

const summaryService = new DocumentSummaryService();

async function processSummaryJob(
    job: Job<DocumentSummaryJobData>,
) {

    await summaryService .generateDocumentSummary(
        job.data.documentId,
    );
}

let summaryWorker:
    Worker<DocumentSummaryJobData>;

export function createDocumentSummaryWorker() {

    summaryWorker = new Worker(
        QUEUES.DOCUMENT_SUMMARY,
        processSummaryJob,
        {
            connection: bullMQConnection,
            concurrency: Math.max(
                1,
                Math.floor(
                    env.WORKER_CONCURRENCY / 2,
                ),
            ),
        },
    );

    summaryWorker.on( "completed", job =>
        logger.info(
            {
                jobId: job.id,
            },
            "Document summary generated",
        ),
    );

    summaryWorker.on("failed", (job, err) =>
        logger.error(
            {
                jobId: job?.id,
                err,
            },
            "Document summary generation failed",
        ),
    );

    return summaryWorker;
}

export async function closeDocumentSummaryWorker(): Promise<void> {
    await summaryWorker?.close();
}