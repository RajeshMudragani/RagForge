import { Worker, Job } from "bullmq";
import { bullMQConnection } from "../../../config/bullmq.config.js";
import { env } from "../../../config/env.config.js";
import { logger } from "../../../logger/logger.js";
import { NotificationJobData } from "../interfaces/notification-job.interface.js";
import { QUEUES } from "../queue/queue.constants.js";

async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
    const { tenantId, type, title } = job.data;
    logger.info({ jobId: job.id, tenantId, type, title }, "Notification job started");

    // TODO: wire NotificationService / email / webhook here
    logger.info({ jobId: job.id }, "Notification job completed");
}

let notificationWorker: Worker<NotificationJobData>;

export function createNotificationWorker(): Worker<NotificationJobData> {
    notificationWorker = new Worker<NotificationJobData>(
        QUEUES.NOTIFICATION,
        processNotificationJob,
        {
            connection: bullMQConnection,
            concurrency: env.WORKER_CONCURRENCY,
        },
    );

    notificationWorker.on("failed", (job, error) => {
        logger.error({ jobId: job?.id, err: error }, "Notification worker: job failed");
    });

    notificationWorker.on("error", (error) => {
        logger.error({ err: error }, "Notification worker: worker error");
    });

    return notificationWorker;
}

export async function closeNotificationWorker(): Promise<void> {
    await notificationWorker?.close();
}
