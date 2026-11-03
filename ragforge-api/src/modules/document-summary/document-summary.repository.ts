import { and, eq } from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { documentSummaries } from "../../database/schema/document_summaries.js";
import { documents } from "../../database/schema/documents.schema.js";
import { collections } from "../../database/schema/collections.schema.js";

export class DocumentSummaryRepository {

    async create(data: {
        documentId: string;
        summary: string;
        shortSummary?: string;
        keyTopics?: string[];
        keywords?: string[];
    }) {

        const [result] = await db.insert(documentSummaries).values(data).returning();
        return result;
    }

    async findByDocumentId(
        documentId: string,
    ) {

        const [result] = await db.select().from(documentSummaries).where(
            eq(
                documentSummaries.documentId,
                documentId,
            ),
        );

        return result ?? null;
    }

    async findAllForTenant(tenantId: string, collectionName?: string) {
        const conditions = [
            eq(documents.tenantId, tenantId),
            eq(documents.status, "COMPLETED"),
        ];

        if (collectionName) {
            conditions.push(eq(collections.name, collectionName));
        }

        return db
            .select({
                documentId: documents.id,
                filename: documents.filename,
                summary: documentSummaries.summary,
                shortSummary: documentSummaries.shortSummary,
                keyTopics: documentSummaries.keyTopics,
                keywords: documentSummaries.keywords,
                summaryStatus: documents.summaryStatus,
            })
            .from(documents)
            .leftJoin(collections, eq(documents.collectionId, collections.id))
            .leftJoin(documentSummaries, eq(documents.id, documentSummaries.documentId))
            .where(and(...conditions))
            .orderBy(documents.filename);
    }

    async findDocumentOwner(documentId: string, tenantId?: string) {
        const [document] = await db
            .select({
                id: documents.id,
                tenantId: documents.tenantId,
                status: documents.status,
            })
            .from(documents)
            .where(
                tenantId
                    ? and(eq(documents.id, documentId), eq(documents.tenantId, tenantId))
                    : eq(documents.id, documentId),
            );

        return document ?? null;
    }

    async updateDocumentSummaryStatus(
        documentId: string,
        summaryStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
    ) {
        const [document] = await db
            .update(documents)
            .set({ summaryStatus, updatedAt: new Date() })
            .where(eq(documents.id, documentId))
            .returning();

        return document;
    }

    async upsert(
        documentId: string,
        summary: string,
        shortSummary: string,
        keyTopics: string[],
        keywords: string[],
    ) {

        const existing = await this.findByDocumentId(
            documentId,
        );

        if (existing) {
            const [updated] = await db
                .update(documentSummaries)
                .set({
                    summary,
                    shortSummary,
                    keyTopics,
                    keywords,
                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        documentSummaries.documentId,
                        documentId,
                    ),
                )
                .returning();

            return updated;
        }

        return this.create({
            documentId,
            summary,
            shortSummary,
            keyTopics,
            keywords,
        });
    }

    async deleteByDocumentId(
        documentId: string,
    ) {

        await db
            .delete(documentSummaries)
            .where(
                eq(
                    documentSummaries.documentId,
                    documentId,
                ),
            );
    }
}
