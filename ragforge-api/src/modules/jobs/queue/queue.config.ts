import { Queue } from "bullmq";
import { bullMQConnection } from "../../../config/bullmq.config.js";
import { env } from "../../../config/env.config.js";
import { QUEUES } from "./queue.constants.js";

const defaultJobOptions = {
    attempts: env.JOB_ATTEMPTS,
    backoff: {
        type: "exponential" as const,
        delay: env.JOB_BACKOFF_DELAY_MS,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
};

export const documentQueue = new Queue(QUEUES.DOCUMENT, {
    connection: bullMQConnection,
    defaultJobOptions,
});

export const evaluationQueue = new Queue(QUEUES.EVALUATION, {
    connection: bullMQConnection,
    defaultJobOptions,
});

export const notificationQueue = new Queue(QUEUES.NOTIFICATION, {
    connection: bullMQConnection,
    defaultJobOptions,
});
