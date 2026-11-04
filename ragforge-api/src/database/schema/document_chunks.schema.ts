import {
    pgTable,
    uuid,
    text,
    integer,
    jsonb,
    timestamp,
    vector,
    index,
    varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { documents } from "./documents.schema.js";
import { env } from "../../config/env.config.js";

export const documentChunks = pgTable("document_chunks", {
    id: uuid("id").defaultRandom().primaryKey(),

    documentId: uuid("document_id").notNull().references(() => documents.id, {
        onDelete: "cascade",
    }),

    content: text("content").notNull(),

    chunkIndex: integer("chunk_index").notNull(),

    pageNumber: integer("page_number"),

    tokenCount: integer("token_count"),

    contentHash: varchar("content_hash", { length: 64 }),

    parentChunkIndex: integer("parent_chunk_index"),

    embedding: vector("embedding", {
        dimensions: env.EMBEDDING_DIMENSIONS,
    }),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    }).defaultNow().notNull(),
},
(table) => [
    index("document_chunks_embedding_hnsw_idx")
        .using("hnsw", table.embedding.op("vector_cosine_ops")),
    index("document_chunks_content_fts_idx")
        .using("gin", sql`to_tsvector('english', ${table.content})`),
    ],
);