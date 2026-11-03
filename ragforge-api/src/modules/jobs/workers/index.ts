import { logger } from "../../../logger/logger.js";
import { createDocumentWorker, closeDocumentWorker } from "./document.worker.js";
import { createEvaluationWorker, closeEvaluationWorker } from "./evaluation.worker.js";
import { createNotificationWorker, closeNotificationWorker } from "./notification.worker.js";
import { documentQueue } from "../queue/queue.config.js";
import { DocumentsRepository } from "../../documents/documents.repository.js";
import { closeDocumentSummaryWorker, createDocumentSummaryWorker } from "./document-summary.worker.js";
import { GuestSessionCleanupService } from "../../guest/guest-session-cleanup.service.js";

const guestSessionCleanup = new GuestSessionCleanupService();

export async function startWorkers(): Promise<void> {
    try {
        const activeJobs = await documentQueue.getActive();

        if (activeJobs.length > 0) {
            const repo = new DocumentsRepository();
            await Promise.all(activeJobs.map(async (job) => {
                await repo.updateStatus(job.data.documentId, "FAILED").catch(() => { /* doc may not exist */ });
                await job.remove().catch(() => { /* already gone */ });
            }));
        }

        await Promise.all([
            documentQueue.clean(0, 1000, "failed"),
            documentQueue.clean(0, 1000, "wait"),
        ]);
    } catch (err) {
        logger.warn({ err }, "Could not clean stale jobs — continuing");
    }

    // Workers are created here — after DB and Redis are confirmed ready
    createDocumentWorker();
    createDocumentSummaryWorker();
    createEvaluationWorker();
    createNotificationWorker();
    guestSessionCleanup.start();

    logger.info(
        "Workers started: document, document-summary, evaluation, notification",
    );
}

export async function closeWorkers(): Promise<void> {
    await Promise.all([
        closeDocumentWorker(),
        closeDocumentSummaryWorker(),
        closeEvaluationWorker(),
        closeNotificationWorker(),
    ]);
    guestSessionCleanup.stop();
    logger.info("All workers closed");
}
