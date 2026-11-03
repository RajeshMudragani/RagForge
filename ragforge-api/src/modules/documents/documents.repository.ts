import { eq, and, inArray, desc } from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { documents } from "../../database/schema/documents.schema.js";
import { CreateDocumentInput } from "./interfaces/create-document.interface.js";
import { collections } from "../../database/schema/collections.schema.js";

export class DocumentsRepository {
    async create(
        input: CreateDocumentInput,
    ) {
        const [document] = await db.insert(documents).values({
            tenantId: input.tenantId,
            filename: input.filename,
            mimeType: input.mimeType,
            storageKey: input.storageKey,
            status: input.status,
            metadata: input.metadata,
            collectionId: input.collectionId,
        })
        .returning();

        return document;
    }

    async findById(
        tenantId: string,
        documentId: string,
    ) {

        const [document] =
            await db
                .select()
                .from(documents)
                .where(
                    and(
                        eq(
                            documents.id,
                            documentId,
                        ),
                        eq(
                            documents.tenantId,
                            tenantId,
                        ),
                    ),
                );

        return document ?? null;
    }

    async findByIdInternal(
        documentId: string,
    ) {

        const [document] = await db
            .select()
            .from(documents)
            .where(
                eq(
                    documents.id,
                    documentId,
                ),
            );

        return document ?? null;
    }

    async updateStatus(
        documentId: string,
        status:
            | "PENDING"
            | "PROCESSING"
            | "EMBEDDING"
            | "COMPLETED"
            | "FAILED",
    ) {
        const [document] = await db
            .update(documents)
            .set({
                status,
                updatedAt: new Date(),
            })
            .where(
                eq(
                    documents.id,
                    documentId,
                ),
            )
            .returning();

        return document;
    }

    async assignCollection(
        tenantId: string,
        documentIds: string[],
        collectionId: string | null,
    ) {
        await db
            .update(documents)
            .set({ collectionId, updatedAt: new Date() })
            .where(and(inArray(documents.id, documentIds), eq(documents.tenantId, tenantId)));
    }

    async update(
        tenantId: string,
        documentId: string,
        data: {
            filename?: string;
            collectionId?: string | null;
        },
    ) {
        const [document] = await db
            .update(documents)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
            .returning();

        return document ?? null;
    }

    async delete(tenantId: string, documentId: string) {
        const [document] = await db
            .delete(documents)
            .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
            .returning();

        return document ?? null;
    }

    async findAll(tenantId: string) {
        const rows = await db
            .select({
                id: documents.id,
                filename: documents.filename,
                mimeType: documents.mimeType,
                status: documents.status,
                progress: documents.progress,
                collectionId: documents.collectionId,
                collectionName: collections.name,
                createdAt: documents.createdAt,
                updatedAt: documents.updatedAt,
            })
            .from(documents)
            .leftJoin(collections, eq(documents.collectionId, collections.id))
            .where(eq(documents.tenantId, tenantId))
            .orderBy(desc(documents.createdAt), desc(documents.id));

        return rows.map(r => ({
            ...r,
            status: r.status === "COMPLETED" ? "READY" : r.status,
        }));
    }

    async updateProgress(
        documentId: string,
        progress: number,
    ) {
        const [document] = await db
            .update(documents)
            .set({
                progress,
                updatedAt: new Date(),
            })
            .where(
                eq(
                    documents.id,
                    documentId,
                ),
            )
            .returning();

        return document;
    }

    async getStatus(
        tenantId: string,
        documentId: string,
    ) {
        const [document] = await db
            .select()
            .from(documents)
            .where(
                and(
                    eq(
                        documents.id,
                        documentId,
                    ),
                    eq(
                        documents.tenantId,
                        tenantId,
                    ),
                ),
            );

        return document ?? null;
    }
}