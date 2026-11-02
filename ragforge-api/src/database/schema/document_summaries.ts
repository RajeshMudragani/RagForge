import {
    pgTable,
    uuid,
    text,
    jsonb,
    timestamp,
} from "drizzle-orm/pg-core";

import { documents } from "./documents.schema.js";

export const documentSummaries = pgTable(
    "document_summaries",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        documentId: uuid("document_id")
            .references(() => documents.id, {
                onDelete: "cascade",
            })
            .notNull(),

        summary: text("summary").notNull(),

        shortSummary: text("short_summary"),

        keyTopics: jsonb("key_topics"),

        keywords: jsonb("keywords"),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
);
