import { sql, eq, and, inArray } from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { documentChunks } from "../../database/schema/document_chunks.schema.js";
import { documents } from "../../database/schema/documents.schema.js";
import { RetrievedChunk } from "./interfaces/retrieved-chunk.interface.js";
import { DocumentChunkInput } from "./interfaces/document-chunk-input.interface.js";
import { documentMetadata } from "../../database/schema/document_metadata.schema.js";

export class RetrievalRepository {

    async similaritySearch(
        tenantId: string,
        embedding: number[],
        limit: number,
        documentIds?: string[],
    ): Promise<RetrievedChunk[]> {

        const queryVector = `[${embedding.join(",")}]`;

        const similarity =
            sql<number>`
                1 - (${documentChunks.embedding} <=> ${queryVector}::vector)
            `;

        const distance =
            sql<number>`
                ${documentChunks.embedding} <=> ${queryVector}::vector
            `;

        const tenantCondition =
            eq(
                documents.tenantId,
                tenantId,
            );

        const documentCondition =
            documentIds?.length
                ? sql`
                    ${documentChunks.documentId}
                    IN (
                        ${sql.join(
                            documentIds.map(
                                id => sql`${id}`,
                            ),
                            sql`, `,
                        )}
                    )
                `
                : undefined;

        const rows =
            await db
                .select({
                    id: documentChunks.id,
                    documentId: documentChunks.documentId,
                    filename: documents.filename,
                    content: documentChunks.content,
                    chunkIndex: documentChunks.chunkIndex,
                    pageNumber: documentChunks.pageNumber,
                    tokenCount: documentChunks.tokenCount,
                    similarity,
                })
                .from(
                    documentChunks,
                )
                .innerJoin(
                    documents,
                    eq(
                        documentChunks.documentId,
                        documents.id,
                    ),
                )
                .where(
                    documentCondition
                        ? and(
                            tenantCondition,
                            documentCondition,
                        )
                        : tenantCondition,
                )
                .orderBy(distance)
                .limit(limit);

        return rows.map(
            row => ({
                ...row,
                similarity: Number(row.similarity),
            }),
        );
    }

    async fetchParentChunks(
        documentId: string,
        parentChunkIndices: number[],
    ): Promise<Map<number, string>> {
        if (parentChunkIndices.length === 0) return new Map();

        // Fetch rows whose chunkIndex matches the parentChunkIndex values
        // (parent rows are identified by their own chunkIndex, not their parentChunkIndex)
        const rows = await db
            .select({
                chunkIndex: documentChunks.chunkIndex,
                content: documentChunks.content,
            })
            .from(documentChunks)
            .where(
                and(
                    eq(documentChunks.documentId, documentId),
                    inArray(documentChunks.chunkIndex, parentChunkIndices),
                ),
            );

        const map = new Map<number, string>();
        rows.forEach(row => {
            if (!map.has(row.chunkIndex)) {
                map.set(row.chunkIndex, row.content);
            }
        });
        return map;
    }

    async addEmbeddings(chunks: DocumentChunkInput[]): Promise<void> {
        if (chunks.length === 0) return;

        const hashes = chunks.map(c => c.contentHash);
        const existing = await db
            .select({ contentHash: documentChunks.contentHash })
            .from(documentChunks)
            .where(inArray(documentChunks.contentHash, hashes));

        const existingHashes = new Set(existing.map(r => r.contentHash));
        const newChunks = chunks.filter(c => !existingHashes.has(c.contentHash));

        if (newChunks.length === 0) return;
        await db.insert(documentChunks).values(newChunks);
    }

    async deleteChunksByDocumentId(documentId: string): Promise<void> {
        await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    }

    async keywordSearch(
        tenantId: string,
        query: string,
        limit: number,
        documentIds?: string[],
    ): Promise<RetrievedChunk[]> {

        const documentFilter =
            documentIds?.length
                ? sql`
                    AND dc.document_id IN (
                        ${sql.join(
                            documentIds.map(
                                id => sql`${id}`,
                            ),
                            sql`, `,
                        )}
                    )
                `
                : sql``;

        const rows =
            await db.execute(sql`
                SELECT
                    dc.id,
                    dc.document_id AS "documentId",
                    d.filename,
                    dc.content,
                    dc.chunk_index AS "chunkIndex",
                    dc.page_number AS "pageNumber",
                    dc.token_count AS "tokenCount",
                    ts_rank(
                        to_tsvector(
                            'english',
                            dc.content
                        ),
                        plainto_tsquery(
                            'english',
                            ${query}
                        )
                    )
                    AS "keywordScore"
                FROM document_chunks dc
                INNER JOIN documents d
                    ON d.id = dc.document_id
                WHERE 
                    d.tenant_id = ${tenantId}
                AND
                    to_tsvector(
                        'english',
                        dc.content
                    )
                    @@
                    plainto_tsquery(
                        'english',
                        ${query}
                    )
                    ${documentFilter}
                ORDER BY
                    "keywordScore" DESC
                LIMIT
                    ${limit}
            `);

        return rows.rows.map(
            row => ({
                id: String(row.id),
                documentId: String(row.documentId),
                filename: String(row.filename),
                content: String(row.content),
                chunkIndex: Number(row.chunkIndex),
                pageNumber: row.pageNumber !== null ? Number(row.pageNumber) : null,
                tokenCount: row.tokenCount !== null ? Number(row.tokenCount) : null,
                similarity: 0,
                keywordScore: Number(row.keywordScore),
                hybridScore: 0,
            }),
        ) as RetrievedChunk[];
    }

    async findMatchingDocumentIds(
        tenantId: string,
        collectionId?: string,
        metadata?: Record<
            string,
            string
        >,
    ): Promise<string[]> {

        let whereConditions =
            sql`
                d.tenant_id =
                ${tenantId}
            `;

        if (
            collectionId
        ) {

            whereConditions =
                sql`
                    ${whereConditions}
                    AND
                    d.collection_id =
                    ${collectionId}
                `;
        }

        const metadataConditions =
            metadata
                ? Object.entries(
                    metadata,
                ).map(
                    ([key, value]) =>
                        sql`
                            EXISTS (
                                SELECT 1
                                FROM document_metadata dm
                                WHERE
                                    dm.document_id =
                                    d.id
                                AND
                                    dm.key =
                                    ${key}
                                AND
                                    dm.value = ${value}
                            )
                        `,
                )
                : [];

        const rows =
            await db.execute(sql`
                SELECT d.id
                FROM documents d
                WHERE
                ${whereConditions}
                ${
                    metadataConditions.length
                        ? sql`
                            AND
                            ${sql.join(
                                metadataConditions,
                                sql` AND `,
                            )}
                        `
                        : sql``
                    }
            `);

        return rows.rows.map(
            row => String(row.id),
        );
    }

    async getDocumentContent(
        documentId: string,
    ): Promise<string> {

        const rows = await db
            .select({
                chunkIndex: documentChunks.chunkIndex,
                content: documentChunks.content,
            })
            .from(documentChunks)
            .where(
                eq(
                    documentChunks.documentId,
                    documentId,
                ),
            )
            .orderBy(
                documentChunks.chunkIndex,
            );

        return rows
            .map(row => row.content)
            .join("\n\n");
    }
}
