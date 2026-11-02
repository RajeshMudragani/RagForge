import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    index,
} from "drizzle-orm/pg-core";

import { conversations } from "./conversations.schema.js";

export const messages = pgTable(
    "messages",
    {
        id: uuid("id")
            .primaryKey(),

        conversationId: uuid(
            "conversation_id",
        )
            .references(
                () => conversations.id,
                {
                    onDelete: "cascade",
                },
            )
            .notNull(),

        role: text("role")
            .notNull(),

        content: text("content")
            .notNull(),

        sequenceNumber: integer(
            "sequence_number",
        )
            .notNull(),

        createdAt: timestamp(
            "created_at",
            {
                withTimezone: true,
            },
        )
            .defaultNow()
            .notNull(),
    },
    table => ({
        conversationIndex: index(
            "messages_conversation_idx",
        ).on(
            table.conversationId,
        ),

        sequenceIndex: index(
            "messages_sequence_idx",
        ).on(
            table.conversationId,
            table.sequenceNumber,
        ),
    }),
);
