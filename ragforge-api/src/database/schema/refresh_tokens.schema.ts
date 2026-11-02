import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";

export const refreshTokens = pgTable(
    "refresh_tokens",
    {
        id: uuid("id").primaryKey(),

        userId: uuid(
            "user_id",
        ).notNull(),

        tokenHash: text(
            "token_hash",
        ).notNull(),

        revoked: boolean(
            "revoked",
        )
            .default(false)
            .notNull(),

        expiresAt: timestamp(
            "expires_at",
            {
                withTimezone: true,
            },
        ).notNull(),

        createdAt: timestamp(
            "created_at",
            {
                withTimezone: true,
            },
        )
            .defaultNow()
            .notNull(),

        updatedAt: timestamp(
            "updated_at",
            {
                withTimezone: true,
            },
        )
            .defaultNow()
            .notNull(),
    },
);