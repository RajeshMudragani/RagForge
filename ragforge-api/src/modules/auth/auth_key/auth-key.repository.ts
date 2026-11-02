import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../../config/db.config.js";
import { authKeys } from "../../../database/schema/auth_keys.schema.js";
import { CacheService } from "../../cache/cache.service.js";

type CreateAuthKeyInput =
    Omit<
        typeof authKeys.$inferInsert,
        "id"
    >;

export class AuthKeyRepository {

    private readonly cache = new CacheService();

    async create(
        data: CreateAuthKeyInput,
    ): Promise<string> {

        const id = randomUUID();

        await db.insert(
            authKeys,
        )
        .values({
            id,
            ...data,
        });

        return id;
    }

    async getActiveKey() {

        const result = await db
            .select()
            .from(
                authKeys,
            )
            .where(
                eq(
                    authKeys.isActive,
                    true,
                ),
            )
            .limit(1);

        return result[0] ?? null;
    }

    async deactivateAll() {

        await db.update(
            authKeys,
        )
        .set({
            isActive: false,
            updatedAt: new Date(),
        });
    }

    async findByKid(
        kid: string,
    ) {

        const cacheKey = `auth:key:${kid}`;

        const cached = await this.cache.get<
            typeof authKeys.$inferSelect
        >(
            cacheKey,
        );

        if (cached) {
            return cached;
        }

        const result = await db
            .select()
            .from(
                authKeys,
            )
            .where(
                eq(
                    authKeys.kid,
                    kid,
                ),
            )
            .limit(1);

        const key = result[0] ?? null;

        if (key) {
            await this.cache.set(
                cacheKey,
                key,
                3600,
            );
        }

        return key;
    }
}