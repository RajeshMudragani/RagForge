import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
} from "drizzle-orm/pg-core";

export const collections = pgTable(
    "collections",
    {
        id: uuid("id").primaryKey(),

        name: varchar(
            "name",
            {
                length: 255,
            },
        ).notNull(),

        tenantId: uuid(
            "tenant_id",
        ).notNull(),

        description: text(
            "description",
        ),

        createdAt: timestamp(
            "created_at",
            {
                withTimezone: true,
            },
        ).defaultNow().notNull(),

        updatedAt: timestamp(
            "updated_at",
            {
                withTimezone: true,
            },
        ).defaultNow().notNull(),
    },
);