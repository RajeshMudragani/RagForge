import {
    pgTable,
    uuid,
    varchar,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey(),

        email: varchar(
            "email",
            {
                length: 255,
            },
        ).notNull(),

        tenantId: uuid(
            "tenant_id",
        ),

        passwordHash: varchar(
            "password_hash",
            {
                length: 500,
            },
        ).notNull(),

        firstName: varchar(
            "first_name",
            {
                length: 100,
            },
        ).notNull(),

        lastName: varchar(
            "last_name",
            {
                length: 100,
            },
        ).notNull(),

        role: varchar(
            "role",
            {
                length: 20,
            },
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