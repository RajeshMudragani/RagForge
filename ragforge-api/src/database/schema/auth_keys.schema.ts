import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";

export const authKeys = pgTable(
    "auth_keys",
    {
        id: uuid("id").primaryKey(),

        kid: varchar(
            "kid",
            {
                length: 100,
            },
        ).notNull(),

        algorithm: varchar(
            "algorithm",
            {
                length: 20,
            },
        ).notNull(),

        publicKey: text(
            "public_key",
        ).notNull(),

        privateKey: text(
            "private_key",
        ).notNull(),

        isActive: boolean(
            "is_active",
        )
            .default(true)
            .notNull(),

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