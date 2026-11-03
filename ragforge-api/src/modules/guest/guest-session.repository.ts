import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { guestSessions } from "../../database/schema/guest_sessions.schema.js";

export class GuestSessionRepository {
    async create(id: string, tokenHash: string, expiresAt: Date): Promise<void> {
        await db.insert(guestSessions).values({ id, tokenHash, expiresAt });
    }

    async findActiveByTokenHash(tokenHash: string) {
        const [session] = await db
            .select({ id: guestSessions.id, expiresAt: guestSessions.expiresAt })
            .from(guestSessions)
            .where(and(
                eq(guestSessions.tokenHash, tokenHash),
                gt(guestSessions.expiresAt, new Date()),
            ))
            .limit(1);

        return session ?? null;
    }

    async isGuestSession(id: string): Promise<boolean> {
        const [session] = await db
            .select({ id: guestSessions.id })
            .from(guestSessions)
            .where(eq(guestSessions.id, id))
            .limit(1);
        return Boolean(session);
    }

    async reserveUpload(id: string): Promise<boolean> {
        const [session] = await db
            .update(guestSessions)
            .set({ uploadCount: sql`${guestSessions.uploadCount} + 1` })
            .where(and(
                eq(guestSessions.id, id),
                gt(guestSessions.expiresAt, new Date()),
                sql`${guestSessions.uploadCount} < 3`,
            ))
            .returning({ id: guestSessions.id });

        return Boolean(session);
    }

    async releaseUpload(id: string): Promise<void> {
        await db
            .update(guestSessions)
            .set({ uploadCount: sql`GREATEST(${guestSessions.uploadCount} - 1, 0)` })
            .where(eq(guestSessions.id, id));
    }

    async resetUploadCount(id: string): Promise<void> {
        await db
            .update(guestSessions)
            .set({ uploadCount: 0 })
            .where(eq(guestSessions.id, id));
    }

    async findExpiredIds() {
        const rows = await db
            .select({ id: guestSessions.id })
            .from(guestSessions)
            .where(lt(guestSessions.expiresAt, new Date()))
            .limit(100);

        return rows.map(row => row.id);
    }

    async findExpiredStorageKeys(id: string): Promise<string[]> {
        const result = await db.execute(sql`
            SELECT d.storage_key AS "storageKey"
            FROM documents d
            INNER JOIN guest_sessions gs ON gs.id = d.tenant_id
            WHERE gs.id = ${id} AND gs.expires_at < NOW()
        `);
        return result.rows.map(row => String(row.storageKey));
    }

    async deleteExpiredSession(id: string): Promise<void> {
        return db.transaction(async tx => {
            const [session] = await tx
                .select({ id: guestSessions.id })
                .from(guestSessions)
                .where(and(
                    eq(guestSessions.id, id),
                    lt(guestSessions.expiresAt, new Date()),
                ))
                .for("update");

            if (!session) return;

            await tx.execute(sql`DELETE FROM documents WHERE tenant_id = ${id}`);
            await tx.execute(sql`DELETE FROM conversations WHERE tenant_id = ${id}`);
            await tx.delete(guestSessions).where(eq(guestSessions.id, id));
        });
    }
}
