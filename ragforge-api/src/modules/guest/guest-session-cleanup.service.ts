import { logger } from "../../logger/logger.js";
import { StorageService } from "../../storage/storage.service.js";
import { redis } from "../../config/redis.config.js";
import { GuestSessionRepository } from "./guest-session.repository.js";

const CLEANUP_INTERVAL_MS = 60 * 1000;

export class GuestSessionCleanupService {
    private readonly repository = new GuestSessionRepository();
    private readonly storage = new StorageService();
    private interval: NodeJS.Timeout | undefined;
    private running = false;

    start(): void {
        if (this.interval) return;
        void this.cleanupExpired();
        this.interval = setInterval(() => void this.cleanupExpired(), CLEANUP_INTERVAL_MS);
    }

    stop(): void {
        if (this.interval) clearInterval(this.interval);
        this.interval = undefined;
    }

    private async cleanupExpired(): Promise<void> {
        if (this.running) return;
        this.running = true;
        try {
            const ids = await this.repository.findExpiredIds();
            for (const id of ids) {
                try {
                    const storageKeys = await this.repository.findExpiredStorageKeys(id);
                    for (const storageKey of storageKeys) {
                        await this.storage.removeObject(storageKey);
                    }
                    await this.repository.deleteExpiredSession(id);
                    const cacheKeys = await redis.keys(`retrieval:*:${id}:*`);
                    if (cacheKeys.length > 0) await redis.del(cacheKeys);
                } catch (err) {
                    logger.error({ err, guestSessionId: id }, "Failed to clean up expired guest session");
                }
            }
        } catch (err) {
            logger.error({ err }, "Failed to find expired guest sessions");
        } finally {
            this.running = false;
        }
    }
}
