import { Queue } from "bullmq";
import { bullMQConnection } from "../../../config/bullmq.config.js";
import { QUEUES } from "./queue.constants.js";
import { DocumentSummaryJobData } from "../interfaces/document-summary-job.interface.js";

export const documentSummaryQueue = new Queue<DocumentSummaryJobData>(
    QUEUES.DOCUMENT_SUMMARY,
    {
        connection: bullMQConnection,
    },
);