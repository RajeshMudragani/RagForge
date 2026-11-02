import {
    documentQueue,
    evaluationQueue,
    notificationQueue,
} from "./queue.config.js";

import { DocumentJobData } from "../interfaces/document-job.interface.js";
import { EvaluationJobData } from "../interfaces/evaluation-job.interface.js";
import { NotificationJobData } from "../interfaces/notification-job.interface.js";
import { DOCUMENT_JOBS } from "../jobs/document.job.js";
import { EVALUATION_JOBS } from "../jobs/evaluation.job.js";
import { NOTIFICATION_JOBS } from "../jobs/notification.job.js";

export class QueueService {

    async enqueueDocument(
        data: DocumentJobData,
    ): Promise<void> {

        await documentQueue.add(
            DOCUMENT_JOBS.PROCESS_DOCUMENT,
            data,
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
                removeOnComplete: 1000,
                removeOnFail: 500,
                priority: 1,
            },
        );
    }

    async enqueueEvaluation(
        data: EvaluationJobData,
    ): Promise<void> {

        await evaluationQueue.add(
            EVALUATION_JOBS.RUN_EVALUATION,
            data,
            {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
                removeOnComplete: 1000,
                removeOnFail: 500,
                priority: 2,
            },
        );
    }

    async enqueueNotification(
        data: NotificationJobData,
    ): Promise<void> {

        await notificationQueue.add(
            NOTIFICATION_JOBS.SEND_NOTIFICATION,
            data,
            {
                attempts: 5,
                backoff: {
                    type: "exponential",
                    delay: 10000,
                },
                removeOnComplete: 1000,
                removeOnFail: 500,
                priority: 3,
            },
        );
    }
}