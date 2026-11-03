import { Queue } from "bullmq";
import { bullMQConnection } from "../../../config/bullmq.config.js";
import { QUEUES } from "./queue.constants.js";
import { DocumentSummaryJobData } from "../interfaces/document-summary-job.interface.js";
import { env } from "../../../config/env.config.js";

export const documentSummaryQueue = new Queue<DocumentSummaryJobData>(
    QUEUES.DOCUMENT_SUMMARY,
    {
        connection: bullMQConnection,
        defaultJobOptions: {
            attempts: env.JOB_ATTEMPTS,
            backoff: {
                type: "exponential" as const,
                delay: env.JOB_BACKOFF_DELAY_MS,
            },
            removeOnComplete: true,
            removeOnFail: true,
        },
    },
);