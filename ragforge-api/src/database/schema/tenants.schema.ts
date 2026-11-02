import {
    pgTable,
    uuid,
    varchar,
    boolean,
    timestamp,
    text,
} from "drizzle-orm/pg-core";

export const tenants = pgTable(
    "tenants",
    {
        id: uuid("id").primaryKey(),

        name: varchar(
            "name",
            {
                length: 255,
            },
        ).notNull(),

        slug: varchar(
            "slug",
            {
                length: 100,
            },
        ).notNull(),

        description: text(
            "description",
        ),

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