import {
    pgTable,
    uuid,
    text,
    varchar,
    timestamp,
} from "drizzle-orm/pg-core";

export const feedbacks = pgTable(
    "feedbacks",
    {
        id: uuid("id").primaryKey(),

        conversationId: uuid(
            "conversation_id",
        ),

        tenantId: uuid(
            "tenant_id",
        ).notNull(),

        question: text(
            "question",
        ).notNull(),

        answer: text(
            "answer",
        ).notNull(),

        rating: varchar(
            "rating",
            {
                length: 20,
            },
        ).notNull(),

        comment: text(
            "comment",
        ),

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