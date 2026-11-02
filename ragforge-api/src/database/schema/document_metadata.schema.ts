import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    index,
} from "drizzle-orm/pg-core";

import { documents } from "./documents.schema.js";

export const documentMetadata = pgTable(
        "document_metadata",
        {
            id: uuid("id").primaryKey(),

            documentId: uuid(
                "document_id",
            ).references(
                    () => documents.id,
                    {
                        onDelete:
                            "cascade",
                    },
                ).notNull(),

            key: varchar(
                "key",
                {
                    length: 255,
                },
            ).notNull(),

            value: varchar(
                "value",
                {
                    length: 500,
                },
            ).notNull(),

            createdAt:
                timestamp(
                    "created_at",
                    {
                        withTimezone: true,
                    },
                ).defaultNow().notNull(),
        },
        table => ({
            documentIdx:
                index(
                    "document_metadata_document_idx",
                )
                .on(
                    table.documentId,
                ),

            keyIdx:
                index(
                    "document_metadata_key_idx",
                )
                .on(
                    table.key,
                ),
        }),
    );