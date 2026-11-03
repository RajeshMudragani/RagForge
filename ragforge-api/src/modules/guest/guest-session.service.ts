import { createHash, randomBytes, randomUUID } from "node:crypto";
import { GuestSessionRepository } from "./guest-session.repository.js";

export const GUEST_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export class GuestSessionService {
    private readonly repository = new GuestSessionRepository();

    async create() {
        const id = randomUUID();
        const token = randomBytes(32).toString("base64url");
        const expiresAt = new Date(Date.now() + GUEST_SESSION_TTL_MS);
        await this.repository.create(id, this.hashToken(token), expiresAt);
        return { token, expiresAt };
    }

    async findActiveSession(token: string) {
        return this.repository.findActiveByTokenHash(this.hashToken(token));
    }

    async reserveUpload(id: string): Promise<boolean> {
        return this.repository.reserveUpload(id);
    }

    async releaseUpload(id: string): Promise<void> {
        await this.repository.releaseUpload(id);
    }

    async resetUploadCount(id: string): Promise<void> {
        await this.repository.resetUploadCount(id);
    }

    private hashToken(token: string): string {
        return createHash("sha256").update(token).digest("hex");
    }
}
