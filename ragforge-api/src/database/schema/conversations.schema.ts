import {
    pgTable,
    uuid,
    timestamp,
    jsonb,
    varchar,
} from "drizzle-orm/pg-core";

export const conversations = pgTable(
    "conversations",
    {
        id: uuid("id")
            .primaryKey(),

        tenantId: uuid(
            "tenant_id",
        ).notNull(),

        title: varchar(
            "title",
            {
                length: 255,
            },
        ),

        metadata: jsonb("metadata"),

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
