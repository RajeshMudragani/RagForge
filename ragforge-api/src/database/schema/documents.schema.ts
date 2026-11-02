import {
    pgTable,
    uuid,
    varchar,
    text,
    jsonb,
    timestamp,
    pgEnum,
    integer,
} from "drizzle-orm/pg-core";

import { collections } from "./collections.schema.js";

export const documentStatusEnum = pgEnum("document_status", [
    "PENDING",
    "PROCESSING",
    "EMBEDDING",
    "COMPLETED",
    "FAILED",
]);

export const documents = pgTable("documents", {
    id: uuid("id").defaultRandom().primaryKey(),

    filename: varchar("filename", {
        length: 255,
    }).notNull(),

    mimeType: varchar("mime_type", {
        length: 100,
    }).notNull(),

    storageKey: text("storage_key").notNull(),

    tenantId: uuid("tenant_id").notNull(),

    collectionId: uuid("collection_id").references(() => collections.id,
        {
            onDelete: "restrict",
        },
    ),

    status: documentStatusEnum("status").default("PENDING").notNull(),

    progress: integer("progress").default(0).notNull(),

    errorMessage: text("error_message"),

    metadata: jsonb("metadata"),

    startedAt: timestamp("started_at", {
        withTimezone: true,
    }),

    completedAt: timestamp("completed_at", {
        withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    }).defaultNow().notNull(),

    summaryStatus: varchar("summary_status", {
        length: 50,
    }).default("PENDING"),

});
