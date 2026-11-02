import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { refreshTokens } from "../../database/schema/refresh_tokens.schema.js";

type CreateRefreshTokenInput = Omit<
        typeof refreshTokens.$inferInsert,
        "id"
    >;

export class AuthRepository {

    async createRefreshToken(
        data: CreateRefreshTokenInput,
    ): Promise<string> {

        const id = randomUUID();

        await db
            .insert(
                refreshTokens,
            )
            .values({
                id,
                ...data,
            });

        return id;
    }

    async findActiveToken(
        tokenHash: string,
    ) {

        const result = await db
            .select()
            .from(
                refreshTokens,
            )
            .where(
                and(
                    eq(
                        refreshTokens.tokenHash,
                        tokenHash,
                    ),
                    eq(
                        refreshTokens.revoked,
                        false,
                    ),
                ),
            )
            .limit(1);

        return result[0] ?? null;
    }

    async revokeToken(
        id: string,
    ) {

        await db.update(
            refreshTokens,
        )
        .set({
            revoked: true,
            updatedAt: new Date(),
        })
        .where(
            eq(
                refreshTokens.id,
                id,
            ),
        );
    }

    async revokeAllUserTokens(
        userId: string,
    ) {

        await db.update(
            refreshTokens,
        )
        .set({
            revoked: true,
            updatedAt: new Date(),
        })
        .where(
            eq(
                refreshTokens.userId,
                userId,
            ),
        );
    }

}
