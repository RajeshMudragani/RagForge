import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { documentMetadata } from "../../database/schema/document_metadata.schema.js";

export class MetadataRepository {

    async add(
        documentId: string,
        key: string,
        value: string,
    ) {

        const [metadata] = await db.insert(
            documentMetadata,
        ).values({
            id: randomUUID(),
            documentId,
            key,
            value,
        }).returning();

        return metadata;
    }

    async bulkAdd(
        documentId: string,
        metadata: Record<
            string,
            string
        >,
    ) {

        const entries = Object.entries(metadata).map(
            ([key, value]) => ({
                id: randomUUID(),
                documentId,
                key,
                value,
            }),
        );

        if (entries.length === 0) {
            return [];
        }

        return db.insert(
            documentMetadata,
        )
        .values(entries)
        .returning();
    }

    async findByDocumentId(
        documentId: string,
    ) {

        return db.select().from(
            documentMetadata,
        )
        .where(
            eq(
                documentMetadata.documentId,
                documentId,
            ),
        );
    }

    async delete(
        documentId: string,
        key: string,
    ) {

        return db.delete(
            documentMetadata,
        )
        .where(
            and(
                eq(
                    documentMetadata.documentId,
                    documentId,
                ),
                eq(
                    documentMetadata.key,
                    key,
                ),
            ),
        );
    }
}