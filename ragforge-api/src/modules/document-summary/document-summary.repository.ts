import { eq } from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { documentSummaries } from "../../database/schema/document_summaries.js";

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
